import { useDashboard } from './dashboard/dashboardContext';
import { WIDGETS } from './widgets/registry';
import { WidgetConfigForm } from './widgets/WidgetRenderers';

/** Settings for the selected widget, as defined by its type. */
function WidgetSettingsPanel() {
  const { selected, widgets, updateConfig } = useDashboard();
  const widget = selected && widgets[selected.id];
  if (!selected || !widget) return null;

  return (
    <section
      aria-label={`${selected.id} settings`}
      style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
    >
      <h3>
        {WIDGETS[widget.type].name} · {selected.id}
      </h3>
      <WidgetConfigForm
        // Remount per widget so inputs never show another widget's values
        key={selected.id}
        widgetId={selected.id}
        widget={widget}
        onChange={(patch) => updateConfig(selected.id, patch)}
      />
    </section>
  );
}

export default WidgetSettingsPanel;
