import { MIN_WIDGET_SIZE } from './constants';
import type { Cell, Edge, GridItem } from './layout';
import type { Box, Point, ResizeState } from './types';

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const gridArea = ({ row, col, rowSpan, colSpan }: GridItem): React.CSSProperties => ({
  gridRow: `${row + 1} / span ${rowSpan}`,
  gridColumn: `${col + 1} / span ${colSpan}`,
});

export const isCell = (data: unknown): data is Cell =>
  typeof (data as Cell | undefined)?.row === 'number' &&
  typeof (data as Cell | undefined)?.col === 'number';

/** Which cell of a (possibly multi-cell) widget at `rect` the pointer grabbed. */
export function grabbedCell(item: GridItem, rect: DOMRect, { x, y }: Point): Cell {
  return {
    row: clamp(Math.floor(((y - rect.top) / rect.height) * item.rowSpan), 0, item.rowSpan - 1),
    col: clamp(Math.floor(((x - rect.left) / rect.width) * item.colSpan), 0, item.colSpan - 1),
  };
}

/** Screen rect of the widget while resizing: dragged sides follow the pointer, within limits. */
export function resizedRect({ edge, widget, grid, delta }: ResizeState): Box {
  let { left, right, top, bottom } = widget;
  if (edge.includes('e')) {
    right += clamp(delta.x, MIN_WIDGET_SIZE - widget.width, grid.right - widget.right);
  }
  if (edge.includes('w')) {
    left += clamp(delta.x, grid.left - widget.left, widget.width - MIN_WIDGET_SIZE);
  }
  if (edge.includes('s')) {
    bottom += clamp(delta.y, MIN_WIDGET_SIZE - widget.height, grid.bottom - widget.bottom);
  }
  if (edge.includes('n')) {
    top += clamp(delta.y, grid.top - widget.top, widget.height - MIN_WIDGET_SIZE);
  }
  return { left, right, top, bottom };
}

/**
 * The widget keeps its original grid area while resizing; margins move its sides to
 * `resizedRect` (a stretched grid item grows with negative margins and shrinks with positive ones).
 */
export function followPointer(state: ResizeState): React.CSSProperties {
  const { widget } = state;
  const rect = resizedRect(state);
  return {
    opacity: 0.5,
    marginLeft: rect.left - widget.left,
    marginRight: widget.right - rect.right,
    marginTop: rect.top - widget.top,
    marginBottom: widget.bottom - rect.bottom,
  };
}

/**
 * Cell each dragged side snaps to: the furthest cell that side has entered. A side takes in a cell
 * as soon as it crosses into it and only gives it up once it has fully left it (gaps included).
 * Sides that aren't being dragged are ignored by `resizeTo`.
 */
export function snapCell(grid: HTMLElement, rect: Box, edge: Edge): Cell {
  const cells = [...grid.querySelectorAll<HTMLElement>('[data-cell-row]')].map((el) => ({
    row: Number(el.dataset.cellRow),
    col: Number(el.dataset.cellCol),
    bounds: el.getBoundingClientRect(),
  }));
  const cols = (entered: (b: DOMRect) => boolean) =>
    cells.filter((c) => entered(c.bounds)).map((c) => c.col);
  const rows = (entered: (b: DOMRect) => boolean) =>
    cells.filter((c) => entered(c.bounds)).map((c) => c.row);

  return {
    row: edge.includes('s')
      ? Math.max(-1, ...rows((b) => b.top < rect.bottom))
      : Math.min(Infinity, ...rows((b) => b.bottom > rect.top)),
    col: edge.includes('e')
      ? Math.max(-1, ...cols((b) => b.left < rect.right))
      : Math.min(Infinity, ...cols((b) => b.right > rect.left)),
  };
}

const DROP_ANIMATION_MS = 200;

/**
 * Animates `el` from the screen box it occupied before a layout change (`from`) to where it is
 * now, sliding and resizing together. Used instead of dnd-kit's drop animation, which only knows
 * about the dragged widget and jumps when its size changes.
 */
export function animateFromBox(el: HTMLElement, from: Box, { raise = false } = {}) {
  if (typeof el.animate !== 'function') return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

  const to = el.getBoundingClientRect();
  const dx = from.left - to.left;
  const dy = from.top - to.top;
  const width = from.right - from.left;
  const height = from.bottom - from.top;
  const unchanged = [dx, dy, width - to.width, height - to.height].every((d) => Math.abs(d) < 1);
  if (unchanged) return;

  // Explicit sizes override the grid's stretch while animating; the content reflows rather than
  // being scaled
  const zIndex = raise ? 3 : undefined;
  el.animate(
    [
      { translate: `${dx}px ${dy}px`, width: `${width}px`, height: `${height}px`, zIndex },
      { translate: '0 0', width: `${to.width}px`, height: `${to.height}px`, zIndex },
    ],
    { duration: DROP_ANIMATION_MS, easing: 'ease' }
  );
}
