import { DragDropProvider } from '@dnd-kit/react';
import { useRef, useState } from 'react';
import { GRID_GAP, ROW_MIN_HEIGHT } from './grid/constants';
import EdgeFrame from './grid/EdgeFrame';
import { followPointer } from './grid/geometry';
import GridCell from './grid/GridCell';
import GridWidget from './grid/GridWidget';
import { type Cell, itemAt } from './grid/layout';
import RemoveWidgetModal from './grid/RemoveWidgetModal';
import SnapIndicator from './grid/SnapIndicator';
import { useGridDrag } from './grid/useGridDrag';
import { useGridLayout } from './grid/useGridLayout';

/**
 * Dashboard grid. In edit mode widgets can be added to empty cells, moved, resized across cells,
 * removed, and rows/columns can be added or removed from the grid's edges.
 */
function DragDropContainer() {
  const [isEditing, setIsEditing] = useState(false);
  const layout = useGridLayout();
  const gridRef = useRef<HTMLDivElement>(null);
  const { handlers, resizing, snaps, isDragging } = useGridDrag(layout, gridRef);
  const [pendingRemoval, setPendingRemoval] = useState<string | null>(null);

  const snapItems = Object.fromEntries(snaps.map((snap) => [snap.id, snap]));
  const isCovered = (cell: Cell) => Boolean(itemAt(layout.items, cell) || itemAt(snapItems, cell));

  return (
    <>
      <label>
        Editing:
        <input
          type="checkbox"
          checked={isEditing}
          onChange={(e) => setIsEditing(e.target.checked)}
        />
      </label>
      <DragDropProvider {...handlers}>
        <EdgeFrame
          enabled={isEditing}
          paused={isDragging}
          canRemove={layout.canRemoveLine}
          onAdd={layout.addLine}
          onRemove={layout.removeLine}
        >
          <div
            ref={gridRef}
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${layout.cols}, 1fr)`,
              gridTemplateRows: `repeat(${layout.rows}, minmax(${ROW_MIN_HEIGHT}px, auto))`,
              gap: GRID_GAP,
            }}
          >
            {layout.cells.map((cell) => (
              <GridCell key={`${cell.row}-${cell.col}`} cell={cell}>
                {isEditing && !isCovered(cell) ? (
                  <button
                    type="button"
                    onClick={() => layout.addItemAt(cell)}
                    style={{ width: '100%', height: '100%', cursor: 'pointer' }}
                  >
                    + Add item
                  </button>
                ) : null}
              </GridCell>
            ))}
            {Object.values(layout.items).map((item) => {
              const isResizing = resizing?.id === item.id;
              return (
                <GridWidget
                  key={item.id}
                  item={item}
                  isEditing={isEditing}
                  resizeStyle={isResizing ? followPointer(resizing) : undefined}
                  resizingEdge={isResizing ? resizing.edge : undefined}
                  onRemove={() => setPendingRemoval(item.id)}
                >
                  {item.id}
                </GridWidget>
              );
            })}
            {snaps.map((snap) => (
              <SnapIndicator key={snap.id} item={snap} />
            ))}
          </div>
        </EdgeFrame>
      </DragDropProvider>
      <RemoveWidgetModal
        itemId={pendingRemoval}
        onConfirm={(itemId) => {
          layout.removeItem(itemId);
          setPendingRemoval(null);
        }}
        onCancel={() => setPendingRemoval(null)}
      />
    </>
  );
}

export default DragDropContainer;
