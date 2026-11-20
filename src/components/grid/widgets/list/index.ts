import { ListBulleted } from '@carbon/icons-react';
import type { WidgetDefinition } from '../types';
import ListSettings from './Settings';
import ListView from './View';

export type ListConfig = { title: string; items: string[] };

export const listWidget: WidgetDefinition<ListConfig> = {
  name: 'List',
  description: 'Bullet points you add and edit',
  icon: ListBulleted,
  defaultConfig: { title: 'List', items: ['First item', 'Second item'] },
  View: ListView,
  Settings: ListSettings,
};
