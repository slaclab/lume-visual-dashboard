import { useState } from 'react';
import { useGridLayout } from '../useGridLayout';
import { createWidget, type WidgetInstance } from '../widgets/registry';
import { DashboardContext, type DashboardState } from './dashboardContext';

/** Shares editing mode, the grid layout, the widgets and the selected widget with its children. */
function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [isEditing, setEditing] = useState(false);
  const { addItemAt, ...gridLayout } = useGridLayout();
  const [widgets, setWidgets] = useState<Record<string, WidgetInstance>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const setIsEditing = (next: boolean) => {
    setEditing(next);
    if (next) setSelectedId(null);
  };

  const updateWidget = (itemId: string, update: (widget: WidgetInstance) => WidgetInstance) =>
    setWidgets((prev) => (prev[itemId] ? { ...prev, [itemId]: update(prev[itemId]) } : prev));

  const value: DashboardState = {
    isEditing,
    setIsEditing,
    layout: {
      ...gridLayout,
      // Keep widgets in step with the grid items that exist
      removeItem: (itemId) => {
        gridLayout.removeItem(itemId);
        setWidgets((prev) =>
          Object.fromEntries(Object.entries(prev).filter(([id]) => id !== itemId))
        );
      },
    },
    widgets,
    addWidget: (cell, type) => {
      const itemId = addItemAt(cell);
      if (itemId) {
        setWidgets((prev) => ({ ...prev, [itemId]: createWidget(type) }));
      }
      return itemId;
    },
    updateConfig: (itemId, patch) =>
      updateWidget(
        itemId,
        (widget) => ({ ...widget, config: { ...widget.config, ...patch } }) as WidgetInstance
      ),
    // Derived, so a removed widget or turning editing on clears it without extra bookkeeping
    selected: (!isEditing && selectedId && gridLayout.items[selectedId]) || null,
    select: setSelectedId,
  };

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export default DashboardProvider;
