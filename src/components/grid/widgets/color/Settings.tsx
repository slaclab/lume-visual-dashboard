import { TextInput } from '@carbon/react';
import { settingsStack, type WidgetSettingsProps } from '../types';
import type { ColorConfig } from '.';

function ColorSettings({ widgetId, config, onChange }: WidgetSettingsProps<ColorConfig>) {
  return (
    <div style={settingsStack}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label htmlFor={`${widgetId}-color`}>Colour</label>
        <input
          id={`${widgetId}-color`}
          type="color"
          value={config.color}
          onChange={(e) => onChange({ color: e.target.value })}
        />
        <code>{config.color}</code>
      </div>
      <TextInput
        id={`${widgetId}-label`}
        labelText="Label"
        value={config.label}
        onChange={(e) => onChange({ label: e.target.value })}
      />
    </div>
  );
}

export default ColorSettings;
