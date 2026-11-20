import { DASHBOARD_COLORS } from './constants';
import { gridArea } from './geometry';
import type { GridItem } from './layout';

/** Dashed outline of where a widget will land when the current drag is released. */
function SnapIndicator({ item }: { item: GridItem }) {
  return (
    <div
      data-snap-indicator={item.id}
      style={{
        ...gridArea(item),
        zIndex: 2,
        pointerEvents: 'none',
        border: `3px dashed ${DASHBOARD_COLORS.accent}`,
        background: `color-mix(in srgb, ${DASHBOARD_COLORS.accent} 15%, transparent)`,
      }}
    />
  );
}

export default SnapIndicator;
