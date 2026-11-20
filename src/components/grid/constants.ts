export const DEFAULT_ROWS = 2;
export const DEFAULT_COLS = 2;

export const GRID_GAP = 16;
export const ROW_MIN_HEIGHT = 300;

// Smallest a widget can be dragged to while resizing, in px
export const MIN_WIDGET_SIZE = 60;

// Resize handles reach halfway into the gap, so neighbouring widgets' handles never overlap
export const HANDLE_OUTSET = GRID_GAP / 2;

/** CSS variables defined in `dashboard.css`, so the colours can be changed in one place. */
export const DASHBOARD_COLORS = {
  widgetBackground: 'var(--dashboard-widget-background)',
  accent: 'var(--dashboard-accent)',
  handle: 'var(--dashboard-handle)',
} as const;
