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
        border: '3px dashed white',
        background: 'rgba(255, 255, 255, 0.15)',
      }}
    />
  );
}

export default SnapIndicator;
