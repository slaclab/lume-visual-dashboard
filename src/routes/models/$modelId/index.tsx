import { createFileRoute } from '@tanstack/react-router';
import ModelPage from '@components/pages/test/ModelPage';

/** `/models/:modelId` has no page of its own; open the default mode. */
export const Route = createFileRoute('/models/$modelId/')({
  component: ModelConfigMode,
});

function ModelConfigMode() {
  const { modelId } = Route.useParams();
  return <ModelPage name={modelId} />;
}
