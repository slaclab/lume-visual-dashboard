import { Image } from '@carbon/icons-react';
import type { WidgetDefinition } from '../types';
import ImageSettings from './Settings';
import ImageView from './View';

export type ImageConfig = { url: string; alt: string };

export const imageWidget: WidgetDefinition<ImageConfig> = {
  name: 'Image',
  description: 'An image from a URL',
  icon: Image,
  defaultConfig: { url: '', alt: '' },
  View: ImageView,
  Settings: ImageSettings,
};
