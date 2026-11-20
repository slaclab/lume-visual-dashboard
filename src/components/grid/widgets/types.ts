import type { ComponentType } from 'react';

export type WidgetViewProps<TConfig> = { config: TConfig };

export type WidgetSettingsProps<TConfig> = {
  /** Used to give the form's inputs unique ids. */
  widgetId: string;
  config: TConfig;
  onChange: (patch: Partial<TConfig>) => void;
};

/**
 * Everything the dashboard needs to know about one kind of widget. Each type lives in its own
 * folder under `widgets/` and is listed once in `registry.ts`.
 */
export type WidgetDefinition<TConfig> = {
  name: string;
  /** One line shown on the type's tile in the add-widget dialog. */
  description: string;
  icon: ComponentType<{ size?: number; 'aria-hidden'?: boolean }>;
  defaultConfig: TConfig;
  /** What the widget shows on the grid. */
  View: ComponentType<WidgetViewProps<TConfig>>;
  /** The widget's configuration form, shown in the settings panel. */
  Settings: ComponentType<WidgetSettingsProps<TConfig>>;
};

export const fill: React.CSSProperties = {
  boxSizing: 'border-box',
  width: '100%',
  height: '100%',
  overflow: 'hidden',
  color: 'white',
};

export const settingsStack: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
};
