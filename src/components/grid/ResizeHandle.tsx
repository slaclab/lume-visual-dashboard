import { ChevronRight } from '@carbon/icons-react';
import { Feedback } from '@dnd-kit/dom';
import { useDraggable } from '@dnd-kit/react';
import { useState } from 'react';
import { DASHBOARD_COLORS, HANDLE_OUTSET } from './constants';
import type { Edge } from './layout';
import type { DragData } from './types';

const HANDLE_SIZE = 16 + HANDLE_OUTSET;
const CORNER_SIZE = 32;
// Edge strips start where the corner squares end
const STRIP_INSET = CORNER_SIZE - HANDLE_OUTSET;

const EDGE_STYLES: Record<Edge, React.CSSProperties> = {
  n: {
    top: -HANDLE_OUTSET,
    left: STRIP_INSET,
    right: STRIP_INSET,
    height: HANDLE_SIZE,
    cursor: 'ns-resize',
  },
  s: {
    bottom: -HANDLE_OUTSET,
    left: STRIP_INSET,
    right: STRIP_INSET,
    height: HANDLE_SIZE,
    cursor: 'ns-resize',
  },
  e: {
    right: -HANDLE_OUTSET,
    top: STRIP_INSET,
    bottom: STRIP_INSET,
    width: HANDLE_SIZE,
    cursor: 'ew-resize',
  },
  w: {
    left: -HANDLE_OUTSET,
    top: STRIP_INSET,
    bottom: STRIP_INSET,
    width: HANDLE_SIZE,
    cursor: 'ew-resize',
  },
  ne: {
    top: -HANDLE_OUTSET,
    right: -HANDLE_OUTSET,
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    cursor: 'nesw-resize',
  },
  nw: {
    top: -HANDLE_OUTSET,
    left: -HANDLE_OUTSET,
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    cursor: 'nwse-resize',
  },
  se: {
    bottom: -HANDLE_OUTSET,
    right: -HANDLE_OUTSET,
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    cursor: 'nwse-resize',
  },
  sw: {
    bottom: -HANDLE_OUTSET,
    left: -HANDLE_OUTSET,
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    cursor: 'nesw-resize',
  },
};

// Rotation of a right-pointing chevron so it points out of each side/corner
const CHEVRON_ROTATION: Record<Edge, number> = {
  e: 0,
  se: 45,
  s: 90,
  sw: 135,
  w: 180,
  nw: 225,
  n: 270,
  ne: 315,
};

type ResizeHandleProps = {
  itemId: string;
  edge: Edge;
  isResizing: boolean;
};

function ResizeHandle({ itemId, edge, isResizing }: ResizeHandleProps) {
  const [hovered, setHovered] = useState(false);
  const { ref } = useDraggable<DragData>({
    id: `${itemId}:resize:${edge}`,
    data: { kind: 'resize', itemId, edge },
    // The widget's edges follow the pointer via `followPointer`, so the handle itself stays put
    plugins: [Feedback.configure({ feedback: 'none' })],
  });
  // Hover is lost once the drag starts, so the widget tells us when this edge is in use
  const active = hovered || isResizing;

  return (
    <div
      ref={ref}
      data-resize-handle={edge}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      style={{
        position: 'absolute',
        zIndex: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 4,
        background: active ? DASHBOARD_COLORS.handle : 'transparent',
        transition: 'background 120ms',
        ...EDGE_STYLES[edge],
      }}
    >
      {active && (
        <ChevronRight
          size={16}
          aria-hidden
          style={{ color: 'white', transform: `rotate(${CHEVRON_ROTATION[edge]}deg)` }}
        />
      )}
    </div>
  );
}

export default ResizeHandle;
