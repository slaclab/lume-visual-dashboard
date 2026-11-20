import { DragDropProvider } from '@dnd-kit/react';
import { useRef, useState } from 'react';
import AddWidgetModal from './grid/AddWidgetModal';
import { GRID_GAP } from './grid/constants';
import './grid/dashboard.css';
import { useDashboard } from './grid/dashboard/dashboardContext';
import EdgeFrame from './grid/EdgeFrame';
import { followPointer } from './grid/geometry';
import GridCell from './grid/GridCell';
import GridWidget from './grid/GridWidget';
import { type Cell, itemAt } from './grid/layout';
import RemoveWidgetModal from './grid/RemoveWidgetModal';
import SnapIndicator from './grid/SnapIndicator';
import { useGridDrag } from './grid/useGridDrag';
import { WIDGETS } from './grid/widgets/registry';
import { WidgetView } from './grid/widgets/WidgetRenderers';

/**
 * Dashboard grid. In edit mode widgets of any registered type can be added to empty cells, moved,
 * resized across cells,
 * removed, and rows/columns can be added or removed from the grid's edges. Outside edit mode,
 * clicking a widget selects it for configuration. Must be rendered inside a `DashboardProvider`.
 */
function DragDropContainer() {
  const { isEditing, layout, widgets, addWidget, selected, select } = useDashboard();
  const gridRef = useRef<HTMLDivElement>(null);
  const { handlers, resizing, snaps, isDragging } = useGridDrag(layout, gridRef);
  const [pendingRemoval, setPendingRemoval] = useState<string | null>(null);
  // Empty cell waiting for the user to pick a widget type
  const [pendingCell, setPendingCell] = useState<Cell | null>(null);

  const snapItems = Object.fromEntries(snaps.map((snap) => [snap.id, snap]));
  const isCovered = (cell: Cell) => Boolean(itemAt(layout.items, cell) || itemAt(snapItems, cell));

  return (
    <>
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
              // Equal rows and columns sharing the space the grid is given; minmax(0, …) stops
              // content such as a large image from growing its track
              gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${layout.rows}, minmax(0, 1fr))`,
              height: '100%',
              gap: GRID_GAP,
            }}
          >
            {layout.cells.map((cell) => (
              <GridCell key={`${cell.row}-${cell.col}`} cell={cell}>
                {isEditing && !isCovered(cell) ? (
                  <button
                    type="button"
                    onClick={() => setPendingCell(cell)}
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
                  selected={selected?.id === item.id}
                  onSelect={() => select(selected?.id === item.id ? null : item.id)}
                >
                  {widgets[item.id] && <WidgetView widget={widgets[item.id]} />}
                </GridWidget>
              );
            })}
            {snaps.map((snap) => (
              <SnapIndicator key={snap.id} item={snap} />
            ))}
          </div>
        </EdgeFrame>
      </DragDropProvider>
      <AddWidgetModal
        open={pendingCell !== null}
        onSelect={(type) => {
          if (pendingCell) addWidget(pendingCell, type);
          setPendingCell(null);
        }}
        onCancel={() => setPendingCell(null)}
      />
      <RemoveWidgetModal
        itemId={pendingRemoval}
        widgetName={pendingRemoval ? WIDGETS[widgets[pendingRemoval]?.type]?.name : undefined}
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
