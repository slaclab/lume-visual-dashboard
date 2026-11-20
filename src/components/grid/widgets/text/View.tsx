import { fill, type WidgetViewProps } from '../types';
import type { TextConfig } from '.';

function TextView({ config }: WidgetViewProps<TextConfig>) {
  return (
    <div style={{ ...fill, padding: '1rem' }}>
      <h3 style={{ margin: '0 0 0.5rem' }}>{config.heading}</h3>
      <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{config.body}</p>
    </div>
  );
}

export default TextView;
