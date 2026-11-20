import { useRef, useState } from 'react';
import { DEFAULT_COLS, DEFAULT_ROWS } from './constants';
import {
  addItem,
  type Cell,
  type GridItem,
  type GridItems,
  insertLine,
  isLineEmpty,
  moveTo,
  removeLine as removeLineFrom,
  type Side,
} from './layout';

const isRowSide = (side: Side) => side === 'top' || side === 'bottom';

/** Grid size and widget placements, with the edits the dashboard supports. */
export function useGridLayout() {
  const [rows, setRows] = useState(DEFAULT_ROWS);
  const [cols, setCols] = useState(DEFAULT_COLS);
  const [items, setItems] = useState<GridItems>({});
  const nextItemNumber = useRef(1);

  const cells: Cell[] = Array.from({ length: rows * cols }, (_, i) => ({
    row: Math.floor(i / cols),
    col: i % cols,
  }));

  const lineCount = (side: Side) => (isRowSide(side) ? rows : cols);
  const setLineCount = (side: Side, count: number) =>
    isRowSide(side) ? setRows(count) : setCols(count);

  const addItemAt = (cell: Cell) => {
    const itemId = `item-${nextItemNumber.current++}`;
    setItems((prev) => addItem(prev, itemId, cell));
  };

  const moveItem = (itemId: string, anchor: Cell) =>
    setItems((prev) => moveTo(prev, itemId, anchor, rows, cols));

  const replaceItem = (item: GridItem) => setItems((prev) => ({ ...prev, [item.id]: item }));

  const removeItem = (itemId: string) =>
    setItems((prev) => Object.fromEntries(Object.entries(prev).filter(([id]) => id !== itemId)));

  const canRemoveLine = (side: Side) => lineCount(side) > 1 && isLineEmpty(items, side, rows, cols);

  const addLine = (side: Side) => {
    setItems((prev) => insertLine(prev, side));
    setLineCount(side, lineCount(side) + 1);
  };

  const removeLine = (side: Side) => {
    setItems((prev) => removeLineFrom(prev, side));
    setLineCount(side, lineCount(side) - 1);
  };

  return {
    rows,
    cols,
    items,
    cells,
    addItemAt,
    moveItem,
    replaceItem,
    removeItem,
    canRemoveLine,
    addLine,
    removeLine,
  };
}

export type GridLayout = ReturnType<typeof useGridLayout>;
