import DragDropContainer from '@components/DragDropContainer';
import DashboardProvider from '@components/grid/dashboard/DashboardProvider';
import { useDashboard } from '@components/grid/dashboard/dashboardContext';
import WidgetSettingsPanel from '@components/grid/WidgetSettingsPanel';

const ASIDE_WIDTH = 260;

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
      {/* Fixed width so the content is clipped, not squeezed, while the panel slides */}
      <div style={{ width: ASIDE_WIDTH, padding: '1rem', boxSizing: 'border-box' }}>
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
    <div style={{ border: '1px solid #ccc', padding: '1rem', flex: 1 }}>
      <h2>Drag and Drop Area</h2>
      <DragDropControls />

      <DragDropContainer />
    </div>
  );
}

function DragDropPage() {
  return (
    <DashboardProvider>
      <div style={{ display: 'flex', flexDirection: 'row' }}>
        <ConfigurationAside />
        <DragDropMain />
      </div>
    </DashboardProvider>
  );
}
export default DragDropPage;
