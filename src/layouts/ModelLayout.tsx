import { Link, Outlet, useParams } from '@tanstack/react-router';

function ModelLayout() {
  const { modelId } = useParams({ from: '/models/$modelId' });
  return (
    <div>
      <nav className="model-nav" aria-label="Model modes">
        <Link to="/models" activeOptions={{ exact: true }}>
          All models
        </Link>
        <Link to="/models/$modelId/interactive" params={{ modelId }}>
          Interactive
        </Link>
        <Link to="/models/$modelId/streaming" params={{ modelId }}>
          Streaming
        </Link>
        <Link to="/models/$modelId/canopy" params={{ modelId }}>
          Canopy
        </Link>
      </nav>
      <Outlet />
    </div>
  );
}
export default ModelLayout;
