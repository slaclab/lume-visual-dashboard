import { useState } from 'react';
import EdgeStrip from './EdgeStrip';
import { type Side, SIDES } from './layout';

// Hover target around the grid in edit mode, and the size of the ghost strip once it opens.
// Widget resize handles overhang HANDLE_OUTSET into the zone, so it's kept well wider than that.
const EDGE_ZONE = 32;
const EDGE_STRIP = 48;

type EdgeFrameProps = {
  enabled: boolean;
  /** Keeps every strip shut, e.g. during a drag, so the grid doesn't shift under the pointer. */
  paused: boolean;
  canRemove: (side: Side) => boolean;
  onAdd: (side: Side) => void;
  onRemove: (side: Side) => void;
  children: React.ReactNode;
};

/** Frames the grid with an add/remove row/column strip on each side, shown in edit mode. */
function EdgeFrame({ enabled, paused, canRemove, onAdd, onRemove, children }: EdgeFrameProps) {
  const [hoveredSide, setHoveredSide] = useState<Side | null>(null);
  const openSide = enabled && !paused ? hoveredSide : null;
  const track = (side: Side) => (!enabled ? 0 : openSide === side ? EDGE_STRIP : EDGE_ZONE);

  return (
    <div
      style={{
        display: 'grid',
        height: '100%',
        gridTemplateColumns: `${track('left')}px minmax(0, 1fr) ${track('right')}px`,
        gridTemplateRows: `${track('top')}px minmax(0, 1fr) ${track('bottom')}px`,
        transition: 'grid-template-columns 150ms, grid-template-rows 150ms',
      }}
    >
      {enabled &&
        SIDES.map((side) => (
          <EdgeStrip
            key={side}
            side={side}
            open={openSide === side}
            canRemove={canRemove(side)}
            onHover={setHoveredSide}
            onAdd={() => onAdd(side)}
            onRemove={() => onRemove(side)}
          />
        ))}
      <div style={{ gridRow: 2, gridColumn: 2, minWidth: 0, minHeight: 0 }}>{children}</div>
    </div>
  );
}

export default EdgeFrame;
