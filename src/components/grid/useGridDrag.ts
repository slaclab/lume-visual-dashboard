import type { DragDropProvider } from '@dnd-kit/react';
import { type ComponentProps, type RefObject, useRef, useState } from 'react';
import { grabbedCell, isCell, resizedRect, snapCell } from './geometry';
import { type Cell, clampResize, type GridItem, moveTo, resizeTo, sameRect } from './layout';
import type { DragData, ResizeState } from './types';
import type { GridLayout } from './useGridLayout';

type DragHandlers = Pick<
  ComponentProps<typeof DragDropProvider>,
  'onDragStart' | 'onDragOver' | 'onDragMove' | 'onDragEnd'
>;

/**
 * Move and resize behaviour for the grid. Returns handlers for `DragDropProvider` plus the live
 * state needed to render the drag: the widget being resized and where things will snap to.
 */
export function useGridDrag(layout: GridLayout, gridRef: RefObject<HTMLElement | null>) {
  const { items, rows, cols } = layout;

  const [resizing, setResizing] = useState<ResizeState | null>(null);
  // Start-of-drag measurements, read in onDragMove without waiting for a re-render
  const resizeStart = useRef<Omit<ResizeState, 'delta'> | null>(null);

  // Rect the widget being resized will snap to; mirrored in a ref so onDragEnd sees the latest value
  const [preview, setPreview] = useState<GridItem | null>(null);
  const previewRef = useRef<GridItem | null>(null);
  const updatePreview = (next: GridItem | null) => {
    previewRef.current = next;
    setPreview(next);
  };

  // Which cell of a multi-cell widget was grabbed, so moves keep that cell under the pointer
  const grabOffset = useRef<Cell>({ row: 0, col: 0 });
  const anchorFor = (cell: Cell): Cell => ({
    row: cell.row - grabOffset.current.row,
    col: cell.col - grabOffset.current.col,
  });

  // Where the moved widget (and a swapped widget) will land; its original spot if the move is invalid
  const [moveSnaps, setMoveSnaps] = useState<GridItem[]>([]);
  const showMoveSnaps = (itemId: string, cell: Cell | null) => {
    const next = cell ? moveTo(items, itemId, anchorFor(cell), rows, cols) : items;
    const landed = Object.values(next).filter((item) => !sameRect(item, items[item.id]));
    setMoveSnaps(landed.length ? landed : [items[itemId]]);
  };

  const handlers: DragHandlers = {
    onDragStart(event) {
      const { source, position } = event.operation;
      const data = source?.data as DragData | undefined;
      const item = data && items[data.itemId];
      if (!item) return;

      if (data.kind === 'resize') {
        const widget = source?.element?.closest('[data-widget-id]')?.getBoundingClientRect();
        const grid = gridRef.current?.getBoundingClientRect();
        if (widget && grid) {
          resizeStart.current = { id: item.id, edge: data.edge, widget, grid };
          setResizing({ ...resizeStart.current, delta: { x: 0, y: 0 } });
        }
        updatePreview(item);
        return;
      }

      const rect = source?.element?.getBoundingClientRect();
      if (!rect) return;
      grabOffset.current = grabbedCell(item, rect, position.initial);
      setMoveSnaps([item]);
    },

    onDragOver(event) {
      const { source, target } = event.operation;
      const data = source?.data as DragData | undefined;
      if (data?.kind !== 'move') return;
      showMoveSnaps(data.itemId, isCell(target?.data) ? target.data : null);
    },

    onDragMove(event) {
      const { source, position } = event.operation;
      const data = source?.data as DragData | undefined;
      const start = resizeStart.current;
      if (data?.kind !== 'resize' || !start || !gridRef.current) return;

      // dragmove fires before `position.current` is updated, so `to` is the latest pointer
      const current = event.to ?? position.current;
      const state = {
        ...start,
        delta: { x: current.x - position.initial.x, y: current.y - position.initial.y },
      };
      setResizing(state);

      // Resize handles use `feedback: 'none'`, which leaves dnd-kit without a drag shape to
      // run collision detection on, so snapping is worked out from the widget's edges.
      const pointer = snapCell(gridRef.current, resizedRect(state), data.edge);
      const item = items[data.itemId];
      if (!item) return;

      const next = clampResize(items, item, resizeTo(item, data.edge, pointer), rows, cols);
      if (!previewRef.current || !sameRect(previewRef.current, next)) updatePreview(next);
    },

    onDragEnd(event) {
      const { source, target } = event.operation;
      const data = source?.data as DragData | undefined;
      const resized = previewRef.current;
      updatePreview(null);
      setMoveSnaps([]);
      setResizing(null);
      resizeStart.current = null;
      if (event.canceled || !data) return;

      if (data.kind === 'resize') {
        if (resized) layout.replaceItem(resized);
        return;
      }

      if (isCell(target?.data)) layout.moveItem(data.itemId, anchorFor(target.data));
    },
  };

  return {
    handlers,
    resizing,
    snaps: preview ? [preview] : moveSnaps,
    // Edge strips stay shut while this is true so the grid doesn't shift under the pointer
    isDragging: Boolean(resizing || moveSnaps.length),
  };
}
