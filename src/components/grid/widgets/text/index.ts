import { TextFont } from '@carbon/icons-react';
import type { WidgetDefinition } from '../types';
import TextSettings from './Settings';
import TextView from './View';

export type TextConfig = { heading: string; body: string };

export const textWidget: WidgetDefinition<TextConfig> = {
  name: 'Text',
  description: 'A heading and paragraph you write',
  icon: TextFont,
  defaultConfig: { heading: 'Heading', body: 'Write something in the settings panel.' },
  View: TextView,
  Settings: TextSettings,
};
