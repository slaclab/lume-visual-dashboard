import { Add, TrashCan } from '@carbon/icons-react';
import { Button, TextInput } from '@carbon/react';
import { settingsStack, type WidgetSettingsProps } from '../types';
import type { ListConfig } from '.';

function ListSettings({ widgetId, config, onChange }: WidgetSettingsProps<ListConfig>) {
  const setItems = (items: string[]) => onChange({ items });

  return (
    <div style={settingsStack}>
      <TextInput
        id={`${widgetId}-title`}
        labelText="Title"
        value={config.title}
        onChange={(e) => onChange({ title: e.target.value })}
      />
      <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
        <legend>Items</legend>
        <div style={{ ...settingsStack, gap: 8, marginTop: 8 }}>
          {config.items.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
              <TextInput
                id={`${widgetId}-item-${i}`}
                labelText={`Item ${i + 1}`}
                hideLabel
                value={item}
                onChange={(e) =>
                  setItems(config.items.map((v, j) => (j === i ? e.target.value : v)))
                }
              />
              <Button
                kind="ghost"
                size="md"
                hasIconOnly
                renderIcon={TrashCan}
                iconDescription={`Remove item ${i + 1}`}
                onClick={() => setItems(config.items.filter((_, j) => j !== i))}
              />
            </div>
          ))}
          <Button
            kind="tertiary"
            size="sm"
            renderIcon={Add}
            onClick={() => setItems([...config.items, ''])}
          >
            Add list item
          </Button>
        </div>
      </fieldset>
    </div>
  );
}

export default ListSettings;
