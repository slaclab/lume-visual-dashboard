import { Image } from '@carbon/icons-react';
import { fill, type WidgetViewProps } from '../types';
import type { ImageConfig } from '.';

function ImageView({ config }: WidgetViewProps<ImageConfig>) {
  if (!config.url) {
    return (
      <div
        style={{
          ...fill,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: 0.8,
        }}
      >
        <Image size={32} aria-hidden />
        <span>No image set</span>
      </div>
    );
  }
  return (
    <div style={{ ...fill, padding: 8 }}>
      <img
        src={config.url}
        alt={config.alt}
        // Native image dragging would fight the grid's own drag and drop
        draggable={false}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
    </div>
  );
}

export default ImageView;
