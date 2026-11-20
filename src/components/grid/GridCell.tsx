import { useDroppable } from '@dnd-kit/react';
import type { Cell } from './layout';

type GridCellProps = {
  cell: Cell;
  children?: React.ReactNode;
};

/** One background cell of the grid; the drop target for moves and the measuring stick for resizes. */
function GridCell({ cell, children }: GridCellProps) {
  const { ref } = useDroppable<Cell>({
    id: `cell-${cell.row}-${cell.col}`,
    data: cell,
  });

  return (
    <div
      ref={ref}
      data-cell-row={cell.row}
      data-cell-col={cell.col}
      style={{
        gridRow: cell.row + 1,
        gridColumn: cell.col + 1,
        minWidth: 0,
        minHeight: 0,
      }}
    >
      {children}
    </div>
  );
}

export default GridCell;
