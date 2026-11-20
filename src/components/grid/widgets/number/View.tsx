import { fill, type WidgetViewProps } from '../types';
import type { NumberConfig } from '.';

function NumberView({ config }: WidgetViewProps<NumberConfig>) {
  return (
    <div
      style={{
        ...fill,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <span>{config.label}</span>
      <span style={{ fontSize: '3rem', fontWeight: 600, lineHeight: 1.2 }}>
        {config.value.toFixed(config.decimals)}
        {config.unit && <span style={{ fontSize: '1.25rem' }}> {config.unit}</span>}
      </span>
    </div>
  );
}

export default NumberView;
