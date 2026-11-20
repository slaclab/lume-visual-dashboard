import { CharacterWholeNumber } from '@carbon/icons-react';
import type { WidgetDefinition } from '../types';
import NumberSettings from './Settings';
import NumberView from './View';

export type NumberConfig = { value: number; label: string; unit: string; decimals: number };

export const numberWidget: WidgetDefinition<NumberConfig> = {
  name: 'Number',
  description: 'A single value with a label and unit',
  icon: CharacterWholeNumber,
  defaultConfig: { value: 42, label: 'Value', unit: '', decimals: 0 },
  View: NumberView,
  Settings: NumberSettings,
};
