import { TextInput } from '@carbon/react';
import { settingsStack, type WidgetSettingsProps } from '../types';
import type { ImageConfig } from '.';

function ImageSettings({ widgetId, config, onChange }: WidgetSettingsProps<ImageConfig>) {
  return (
    <div style={settingsStack}>
      <TextInput
        id={`${widgetId}-url`}
        labelText="Image URL"
        placeholder="https://…"
        value={config.url}
        onChange={(e) => onChange({ url: e.target.value.trim() })}
      />
      <TextInput
        id={`${widgetId}-alt`}
        labelText="Alt text"
        helperText="Describes the image for screen readers"
        value={config.alt}
        onChange={(e) => onChange({ alt: e.target.value })}
      />
    </div>
  );
}

export default ImageSettings;
