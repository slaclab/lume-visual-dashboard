export type Cell = { row: number; col: number };

// 0-indexed; spans are at least 1
export type GridItem = Cell & { id: string; rowSpan: number; colSpan: number };

export type GridItems = Record<string, GridItem>;

export type Edge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export const EDGES: Edge[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

type Bounds = { top: number; bottom: number; left: number; right: number };

const toBounds = (item: GridItem): Bounds => ({
  top: item.row,
  bottom: item.row + item.rowSpan - 1,
  left: item.col,
  right: item.col + item.colSpan - 1,
});

const fromBounds = (id: string, b: Bounds): GridItem => ({
  id,
  row: b.top,
  col: b.left,
  rowSpan: b.bottom - b.top + 1,
  colSpan: b.right - b.left + 1,
});

export const sameRect = (a: GridItem, b: GridItem) =>
  a.row === b.row && a.col === b.col && a.rowSpan === b.rowSpan && a.colSpan === b.colSpan;

export function overlaps(a: GridItem, b: GridItem): boolean {
  return (
    a.row < b.row + b.rowSpan &&
    b.row < a.row + a.rowSpan &&
    a.col < b.col + b.colSpan &&
    b.col < a.col + a.colSpan
  );
}

export function inBounds(item: GridItem, rows: number, cols: number): boolean {
  return (
    item.row >= 0 &&
    item.col >= 0 &&
    item.row + item.rowSpan <= rows &&
    item.col + item.colSpan <= cols
  );
}

export function isFree(items: GridItems, rect: GridItem, ignoreId = rect.id): boolean {
  return Object.values(items).every((other) => other.id === ignoreId || !overlaps(other, rect));
}

export function itemAt(items: GridItems, cell: Cell): GridItem | undefined {
  const probe: GridItem = { id: '', ...cell, rowSpan: 1, colSpan: 1 };
  return Object.values(items).find((item) => overlaps(item, probe));
}

/** Rect the item would have if `edge` were dragged to `pointer`, ignoring other items. */
export function resizeTo(item: GridItem, edge: Edge, pointer: Cell): GridItem {
  const b = toBounds(item);
  if (edge.includes('n')) b.top = Math.min(b.bottom, pointer.row);
  if (edge.includes('s')) b.bottom = Math.max(b.top, pointer.row);
  if (edge.includes('w')) b.left = Math.min(b.right, pointer.col);
  if (edge.includes('e')) b.right = Math.max(b.left, pointer.col);
  return fromBounds(item.id, b);
}

/**
 * Walks each side from `item` toward `target` one cell at a time and stops before the first
 * step that would leave the grid or overlap another item.
 */
export function clampResize(
  items: GridItems,
  item: GridItem,
  target: GridItem,
  rows: number,
  cols: number
): GridItem {
  const current = toBounds(item);
  const goal = toBounds(target);
  const valid = (b: Bounds) => {
    const rect = fromBounds(item.id, b);
    return inBounds(rect, rows, cols) && isFree(items, rect);
  };

  for (const side of ['left', 'right', 'top', 'bottom'] as const) {
    while (current[side] !== goal[side]) {
      const step = { ...current, [side]: current[side] + Math.sign(goal[side] - current[side]) };
      if (!valid(step)) break;
      Object.assign(current, step);
    }
  }
  return fromBounds(item.id, current);
}

/**
 * Moves `itemId` so its top-left lands on `anchor`. If the spot is taken by exactly one item of
 * the same size, the two swap places; any other conflict leaves the layout unchanged.
 */
export function moveTo(
  items: GridItems,
  itemId: string,
  anchor: Cell,
  rows: number,
  cols: number
): GridItems {
  const item = items[itemId];
  if (!item) return items;

  const candidate = { ...item, ...anchor };
  if (sameRect(candidate, item)) return items;

  if (inBounds(candidate, rows, cols) && isFree(items, candidate)) {
    return { ...items, [itemId]: candidate };
  }

  const occupants = Object.values(items).filter(
    (other) => other.id !== itemId && overlaps(other, candidate)
  );
  if (occupants.length !== 1) return items;

  const [occupant] = occupants;
  if (occupant.rowSpan !== item.rowSpan || occupant.colSpan !== item.colSpan) return items;

  return {
    ...items,
    [itemId]: { ...item, row: occupant.row, col: occupant.col },
    [occupant.id]: { ...occupant, row: item.row, col: item.col },
  };
}

export function addItem(items: GridItems, id: string, cell: Cell): GridItems {
  const item: GridItem = { id, ...cell, rowSpan: 1, colSpan: 1 };
  return isFree(items, item) ? { ...items, [id]: item } : items;
}

export type Side = 'top' | 'bottom' | 'left' | 'right';

export const SIDES: Side[] = ['top', 'bottom', 'left', 'right'];

const shiftAll = (items: GridItems, dRow: number, dCol: number): GridItems =>
  Object.fromEntries(
    Object.values(items).map((item) => [
      item.id,
      { ...item, row: item.row + dRow, col: item.col + dCol },
    ])
  );

/** Adds a row/column on `side`; items shift so they stay in place relative to each other. */
export function insertLine(items: GridItems, side: Side): GridItems {
  if (side === 'top') return shiftAll(items, 1, 0);
  if (side === 'left') return shiftAll(items, 0, 1);
  return items;
}

/** Removes the row/column on `side`; only valid when `isLineEmpty` is true. */
export function removeLine(items: GridItems, side: Side): GridItems {
  if (side === 'top') return shiftAll(items, -1, 0);
  if (side === 'left') return shiftAll(items, 0, -1);
  return items;
}

export function isLineEmpty(items: GridItems, side: Side, rows: number, cols: number): boolean {
  const line: GridItem =
    side === 'top' || side === 'bottom'
      ? { id: '', row: side === 'top' ? 0 : rows - 1, col: 0, rowSpan: 1, colSpan: cols }
      : { id: '', row: 0, col: side === 'left' ? 0 : cols - 1, rowSpan: rows, colSpan: 1 };
  return Object.values(items).every((item) => !overlaps(item, line));
}
