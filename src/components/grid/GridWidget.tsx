import { Close } from '@carbon/icons-react';
import { useDraggable } from '@dnd-kit/react';
import { useState } from 'react';
import { DASHBOARD_COLORS } from './constants';
import { gridArea } from './geometry';
import { EDGES, type Edge, type GridItem } from './layout';
import ResizeHandle from './ResizeHandle';
import type { DragData } from './types';

// Inside the corner resize handle (CORNER_SIZE minus HANDLE_OUTSET) with a little breathing room
const REMOVE_BUTTON_INSET = 28;

type GridWidgetProps = {
  item: GridItem;
  isEditing: boolean;
  /** Styles that make the widget follow the pointer while one of its edges is dragged. */
  resizeStyle?: React.CSSProperties;
  resizingEdge?: Edge;
  onRemove: () => void;
  /** Whether this widget's settings are open; only meaningful outside edit mode. */
  selected: boolean;
  /** Called when the widget is clicked outside edit mode. */
  onSelect: () => void;
  children: React.ReactNode;
};

/**
 * A widget placed over its grid cells. In edit mode drag the centre to move it and the edges to
 * resize it; otherwise clicking it selects it.
 */
function GridWidget({
  item,
  isEditing,
  resizeStyle,
  resizingEdge,
  onRemove,
  selected,
  onSelect,
  children,
}: GridWidgetProps) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const { ref, handleRef, isDragging } = useDraggable<DragData>({
    id: item.id,
    data: { kind: 'move', itemId: item.id },
    disabled: !isEditing,
  });
  const showRemove = isEditing && (hovered || focused) && !isDragging && !resizingEdge;

  return (
    <div
      // Outside edit mode dnd-kit shouldn't decorate the widget (it adds its own role/tabindex)
      ref={isEditing ? ref : undefined}
      data-widget-id={item.id}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
      }}
      style={{
        ...gridArea(item),
        position: 'relative',
        zIndex: 1,
        background: DASHBOARD_COLORS.widgetBackground,
        border: '1px solid black',
        outline: !isEditing && selected ? `3px solid ${DASHBOARD_COLORS.accent}` : undefined,
        outlineOffset: 2,
        opacity: isDragging ? 0.5 : undefined,
        ...resizeStyle,
      }}
    >
      {isEditing ? (
        <div key="move" ref={handleRef} style={{ width: '100%', height: '100%', cursor: 'grab' }}>
          {children}
        </div>
      ) : (
        <div
          key="select"
          role="button"
          tabIndex={0}
          aria-pressed={selected}
          aria-label={`Configure ${item.id}`}
          onClick={onSelect}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelect();
            }
          }}
          style={{ width: '100%', height: '100%', cursor: 'pointer' }}
        >
          {children}
        </div>
      )}
      {isEditing && (
        // Outside the move handle so pressing it never starts a drag; kept in the DOM (just
        // invisible) so it can be reached with Tab and revealed by focus.
        <button
          type="button"
          data-remove-widget={item.id}
          onClick={onRemove}
          aria-label={`Remove ${item.id}`}
          title={`Remove ${item.id}`}
          style={{
            position: 'absolute',
            top: REMOVE_BUTTON_INSET,
            right: REMOVE_BUTTON_INSET,
            zIndex: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            padding: 0,
            border: 'none',
            borderRadius: '50%',
            background: 'rgba(0, 0, 0, 0.55)',
            color: 'white',
            cursor: 'pointer',
            opacity: showRemove ? 1 : 0,
            pointerEvents: showRemove ? 'auto' : 'none',
            transition: 'opacity 120ms',
          }}
        >
          <Close size={16} aria-hidden />
        </button>
      )}
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
