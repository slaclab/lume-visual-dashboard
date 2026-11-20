import { ColorPalette } from '@carbon/icons-react';
import type { WidgetDefinition } from '../types';
import ColorSettings from './Settings';
import ColorView from './View';

export type ColorConfig = { color: string; label: string };

export const colorWidget: WidgetDefinition<ColorConfig> = {
  name: 'Color',
  description: 'A block of colour you pick',
  icon: ColorPalette,
  defaultConfig: { color: '#f1c21b', label: '' },
  View: ColorView,
  Settings: ColorSettings,
};
