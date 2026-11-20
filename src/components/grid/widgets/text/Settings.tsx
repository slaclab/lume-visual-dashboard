import { TextArea, TextInput } from '@carbon/react';
import { settingsStack, type WidgetSettingsProps } from '../types';
import type { TextConfig } from '.';

function TextSettings({ widgetId, config, onChange }: WidgetSettingsProps<TextConfig>) {
  return (
    <div style={settingsStack}>
      <TextInput
        id={`${widgetId}-heading`}
        labelText="Heading"
        value={config.heading}
        onChange={(e) => onChange({ heading: e.target.value })}
      />
      <TextArea
        id={`${widgetId}-body`}
        labelText="Body"
        rows={4}
        value={config.body}
        onChange={(e) => onChange({ body: e.target.value })}
      />
    </div>
  );
}

export default TextSettings;
