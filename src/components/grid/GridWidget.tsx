import { useDraggable } from '@dnd-kit/react';
import { gridArea } from './geometry';
import { EDGES, type Edge, type GridItem } from './layout';
import ResizeHandle from './ResizeHandle';
import type { DragData } from './types';

type GridWidgetProps = {
  item: GridItem;
  isEditing: boolean;
  /** Styles that make the widget follow the pointer while one of its edges is dragged. */
  resizeStyle?: React.CSSProperties;
  resizingEdge?: Edge;
  children: React.ReactNode;
};

/** A widget placed over its grid cells; drag the centre to move it, the edges to resize it. */
function GridWidget({ item, isEditing, resizeStyle, resizingEdge, children }: GridWidgetProps) {
  const { ref, handleRef, isDragging } = useDraggable<DragData>({
    id: item.id,
    data: { kind: 'move', itemId: item.id },
    disabled: !isEditing,
  });

  return (
    <div
      ref={ref}
      data-widget-id={item.id}
      style={{
        ...gridArea(item),
        position: 'relative',
        zIndex: 1,
        background: 'red',
        border: '1px solid black',
        opacity: isDragging ? 0.5 : undefined,
        ...resizeStyle,
      }}
    >
      <div
        ref={handleRef}
        style={{ width: '100%', height: '100%', cursor: isEditing ? 'grab' : 'default' }}
      >
        {children}
      </div>
      {isEditing &&
        EDGES.map((edge) => (
          <ResizeHandle
            key={edge}
            itemId={item.id}
            edge={edge}
            isResizing={edge === resizingEdge}
          />
        ))}
    </div>
  );
}

export default GridWidget;
