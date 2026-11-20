import { colorWidget } from './color';
import { imageWidget } from './image';
import { listWidget } from './list';
import { numberWidget } from './number';
import { textWidget } from './text';
import type { WidgetDefinition } from './types';

/** Every widget type the dashboard offers. Add a type by creating its folder and listing it here. */
export const WIDGETS = {
  text: textWidget,
  color: colorWidget,
  number: numberWidget,
  list: listWidget,
  image: imageWidget,
} as const;

export type WidgetType = keyof typeof WIDGETS;

export const WIDGET_TYPES = Object.keys(WIDGETS) as WidgetType[];

type ConfigOf<D> = D extends WidgetDefinition<infer TConfig> ? TConfig : never;

export type WidgetConfig<T extends WidgetType> = ConfigOf<(typeof WIDGETS)[T]>;

/** A widget on the grid: its type and that type's own settings. */
export type WidgetInstance = {
  [T in WidgetType]: { type: T; config: WidgetConfig<T> };
}[WidgetType];

export function createWidget(type: WidgetType): WidgetInstance {
  return {
    type,
    config: structuredClone(WIDGETS[type].defaultConfig),
  } as WidgetInstance;
}
