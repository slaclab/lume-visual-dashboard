import DragDropContainer from '@components/DragDropContainer';
import DashboardProvider from '@components/grid/dashboard/DashboardProvider';
import { useDashboard } from '@components/grid/dashboard/dashboardContext';
import WidgetSettingsPanel from '@components/grid/WidgetSettingsPanel';

const ASIDE_WIDTH = 260;
// SWAPPS AppHeader height, which `.app-main` pads for (see App.css)
const HEADER_HEIGHT = '3rem';

/** Slides open while a widget is selected outside edit mode, and collapses otherwise. */
function ConfigurationAside() {
  const { selected } = useDashboard();
  const open = selected !== null;

  return (
    <aside
      aria-label="Configuration"
      inert={!open}
      style={{
        flex: 'none',
        width: open ? ASIDE_WIDTH : 0,
        marginRight: open ? '1rem' : 0,
        overflow: 'hidden',
        border: `${open ? 1 : 0}px solid #ccc`,
        transition: 'width 150ms, margin-right 150ms, border-width 150ms',
      }}
    >
      {/* Fixed width so the content is clipped, not squeezed, while the panel slides; long
          settings (e.g. a list widget's items) scroll within the panel */}
      <div
        style={{
          width: ASIDE_WIDTH,
          height: '100%',
          padding: '1rem',
          boxSizing: 'border-box',
          overflowY: 'auto',
        }}
      >
        <h2>Configuration</h2>
        <WidgetSettingsPanel />
      </div>
    </aside>
  );
}

function DragDropControls() {
  const { isEditing, setIsEditing } = useDashboard();
  return (
    <div style={{ border: '1px solid #ccc', padding: '1rem', marginBottom: '1rem' }}>
      <button type="button" onClick={() => setIsEditing(!isEditing)}>
        {isEditing ? 'Stop Editing' : 'Edit'}
      </button>
    </div>
  );
}

function DragDropMain() {
  return (
    <div
      style={{
        border: '1px solid #ccc',
        padding: '1rem',
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <h2>Drag and Drop Area</h2>
      <DragDropControls />

      {/* The grid takes whatever height is left */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <DragDropContainer />
      </div>
    </div>
  );
}

function DragDropPage() {
  return (
    <DashboardProvider>
      {/* Exactly fills the window below the header, so this page never scrolls */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          height: `calc(100dvh - ${HEADER_HEIGHT})`,
          overflow: 'hidden',
        }}
      >
        <ConfigurationAside />
        <DragDropMain />
      </div>
    </DashboardProvider>
  );
}
export default DragDropPage;
