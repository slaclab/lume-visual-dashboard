import { NumberInput, TextInput } from '@carbon/react';
import { settingsStack, type WidgetSettingsProps } from '../types';
import type { NumberConfig } from '.';

function NumberSettings({ widgetId, config, onChange }: WidgetSettingsProps<NumberConfig>) {
  return (
    <div style={settingsStack}>
      <NumberInput
        id={`${widgetId}-value`}
        label="Value"
        value={config.value}
        step={1}
        onChange={(_, { value }) => {
          const parsed = Number(value);
          if (Number.isFinite(parsed)) onChange({ value: parsed });
        }}
      />
      <TextInput
        id={`${widgetId}-label`}
        labelText="Label"
        value={config.label}
        onChange={(e) => onChange({ label: e.target.value })}
      />
      <TextInput
        id={`${widgetId}-unit`}
        labelText="Unit"
        value={config.unit}
        onChange={(e) => onChange({ unit: e.target.value })}
      />
      <NumberInput
        id={`${widgetId}-decimals`}
        label="Decimal places"
        value={config.decimals}
        min={0}
        max={6}
        onChange={(_, { value }) =>
          onChange({ decimals: Math.min(6, Math.max(0, Number(value) || 0)) })
        }
      />
    </div>
  );
}

export default NumberSettings;
