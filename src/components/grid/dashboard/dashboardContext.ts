import { createContext, useContext } from 'react';
import type { Cell, GridItem } from '../layout';
import type { GridLayout } from '../useGridLayout';
import type { WidgetInstance, WidgetType } from '../widgets/registry';

/** Grid edits available through the context; widgets are added with `addWidget` instead. */
export type DashboardLayout = Omit<GridLayout, 'addItemAt'>;

export type DashboardState = {
  isEditing: boolean;
  setIsEditing: (isEditing: boolean) => void;
  layout: DashboardLayout;
  widgets: Record<string, WidgetInstance>;
  /** Adds a widget of `type` to an empty cell; returns its id, or null if the cell is taken. */
  addWidget: (cell: Cell, type: WidgetType) => string | null;
  /** Merges `patch` into the widget's type-specific config. */
  updateConfig: (itemId: string, patch: Partial<WidgetInstance['config']>) => void;
  /** The widget whose settings are shown; always null while editing. */
  selected: GridItem | null;
  select: (itemId: string | null) => void;
};

export const DashboardContext = createContext<DashboardState | null>(null);

export function useDashboard(): DashboardState {
  const value = useContext(DashboardContext);
  if (!value) throw new Error('useDashboard must be used inside a <DashboardProvider>');
  return value;
}
