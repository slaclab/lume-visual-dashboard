import { fill, type WidgetViewProps } from '../types';
import type { ListConfig } from '.';

function ListView({ config }: WidgetViewProps<ListConfig>) {
  return (
    <div style={{ ...fill, padding: '1rem', overflowY: 'auto' }}>
      <h3 style={{ margin: '0 0 0.5rem' }}>{config.title}</h3>
      <ul style={{ margin: 0, paddingLeft: '1.25rem', listStyle: 'disc' }}>
        {config.items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export default ListView;
