import { fill, type WidgetViewProps } from '../types';
import type { ColorConfig } from '.';

/** Black or white, whichever reads better on `hex`. */
function textColorOn(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) || 0);
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? '#161616' : '#ffffff';
}

function ColorView({ config }: WidgetViewProps<ColorConfig>) {
  return (
    <div
      data-color-swatch={config.color}
      style={{
        ...fill,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        background: config.color,
        color: textColorOn(config.color),
      }}
    >
      {config.label && <strong>{config.label}</strong>}
      <code>{config.color}</code>
    </div>
  );
}

export default ColorView;
