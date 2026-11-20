import { WIDGETS, type WidgetInstance } from './registry';
import type { WidgetDefinition } from './types';

type AnyConfig = WidgetInstance['config'];

// `widget.type` and `widget.config` always match, but TypeScript can't follow that through an
// indexed lookup, so the one cast lives here rather than at every call site.
const definitionOf = (widget: WidgetInstance) =>
  WIDGETS[widget.type] as unknown as WidgetDefinition<AnyConfig>;

export function WidgetView({ widget }: { widget: WidgetInstance }) {
  const { View } = definitionOf(widget);
  return <View config={widget.config} />;
}

type WidgetConfigFormProps = {
  widgetId: string;
  widget: WidgetInstance;
  onChange: (patch: Partial<AnyConfig>) => void;
};

export function WidgetConfigForm({ widgetId, widget, onChange }: WidgetConfigFormProps) {
  const { Settings } = definitionOf(widget);
  return <Settings widgetId={widgetId} config={widget.config} onChange={onChange} />;
}
