import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { createWidget, WIDGET_TYPES, WIDGETS, type WidgetInstance } from './registry';
import { WidgetConfigForm, WidgetView } from './WidgetRenderers';

function Harness({ initial }: { initial: WidgetInstance }) {
  const [widget, setWidget] = useState(initial);
  return (
    <>
      <div data-testid="view">
        <WidgetView widget={widget} />
      </div>
      <div data-testid="settings">
        <WidgetConfigForm
          widgetId="w"
          widget={widget}
          onChange={(patch) =>
            setWidget((w) => ({ ...w, config: { ...w.config, ...patch } }) as WidgetInstance)
          }
        />
      </div>
    </>
  );
}

// Every registered type must render with its defaults and have settings that drive its view
describe.each(WIDGET_TYPES)('%s widget', (type) => {
  it('has a name, description and default config', () => {
    const { name, description, defaultConfig } = WIDGETS[type];
    expect(name).not.toBe('');
    expect(description).not.toBe('');
    expect(createWidget(type).config).toEqual(defaultConfig);
  });

  it('updates its view from its settings', () => {
    render(<Harness initial={createWidget(type)} />);
    const view = screen.getByTestId('view');
    const before = view.innerHTML;

    const [field] = within(screen.getByTestId('settings')).getAllByRole('textbox');
    fireEvent.change(field, { target: { value: 'https://example.test/contract.png' } });

    expect(view.innerHTML).not.toBe(before);
  });
});
