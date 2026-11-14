import { createFileRoute, Link, notFound, Outlet } from '@tanstack/react-router';
import { LumeApiError } from '../../api/client';
import { lumeQueries } from '../../api/queries';

/** Layout shared by every mode of a model: `/models/:modelId/*`. */
export const Route = createFileRoute('/models/$modelId')({
  loader: async ({ context: { queryClient }, params: { modelId } }) => {
    try {
      await queryClient.query({ ...lumeQueries.config(modelId), staleTime: 'static' });
    } catch (error) {
      if (error instanceof LumeApiError && error.status === 404) throw notFound();
      throw error;
    }
  },
  component: ModelLayout,
  notFoundComponent: ModelNotFound,
});

function ModelLayout() {
  const { modelId } = Route.useParams();
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

function ModelNotFound() {
  const { modelId } = Route.useParams();
  return (
    <div role="alert">
      <p>Model “{modelId}” was not found.</p>
      <Link to="/models">Back to models</Link>
    </div>
  );
}
