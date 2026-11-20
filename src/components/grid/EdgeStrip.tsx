import { Add, Subtract } from '@carbon/icons-react';
import type { Side } from './layout';

// Placement of each strip in the 3x3 wrapper around the grid (see EdgeFrame)
const SIDE_AREAS: Record<Side, React.CSSProperties> = {
  top: { gridRow: 1, gridColumn: 2 },
  bottom: { gridRow: 3, gridColumn: 2 },
  left: { gridRow: 2, gridColumn: 1 },
  right: { gridRow: 2, gridColumn: 3 },
};

const buttonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 4,
  border: 'none',
  color: 'white',
  cursor: 'pointer',
};

type EdgeStripProps = {
  side: Side;
  open: boolean;
  canRemove: boolean;
  onHover: (side: Side | null) => void;
  onAdd: () => void;
  onRemove: () => void;
};

/** Hover zone on one side of the grid that opens into a ghost row/column with add/remove buttons. */
function EdgeStrip({ side, open, canRemove, onHover, onAdd, onRemove }: EdgeStripProps) {
  const line = side === 'top' || side === 'bottom' ? 'row' : 'column';
  const vertical = line === 'column';

  return (
    <div
      data-edge-strip={side}
      onPointerEnter={() => onHover(side)}
      onPointerLeave={() => onHover(null)}
      style={{
        ...SIDE_AREAS[side],
        display: 'flex',
        flexDirection: vertical ? 'column' : 'row',
        gap: 4,
        // Keeps the open strip off the grid so it reads as a separate ghost row/column
        margin: open ? 4 : 0,
        border: open ? '2px dashed rgba(255, 255, 255, 0.6)' : '2px solid transparent',
        borderRadius: 4,
        background: open ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
        transition: 'background 150ms, border-color 150ms, margin 150ms',
        overflow: 'hidden',
      }}
    >
      {open && (
        <>
          <button
            type="button"
            onClick={onAdd}
            aria-label={`Add ${line} ${side}`}
            title={`Add ${line} ${side}`}
            style={{ ...buttonStyle, flex: 1, background: 'transparent' }}
          >
            <Add size={16} aria-hidden />
            {!vertical && `Add ${line}`}
          </button>
          {canRemove && (
            <button
              type="button"
              onClick={onRemove}
              aria-label={`Remove ${side} ${line}`}
              title={`Remove ${side} ${line}`}
              style={{ ...buttonStyle, padding: 6, background: 'rgba(0, 0, 0, 0.35)' }}
            >
              <Subtract size={16} aria-hidden />
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default EdgeStrip;
