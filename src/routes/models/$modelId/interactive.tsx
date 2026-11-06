import { createFileRoute } from '@tanstack/react-router';
import InteractivePage from '../../../components/InteractivePage';

export const Route = createFileRoute('/models/$modelId/interactive')({
  component: InteractiveMode,
});

function InteractiveMode() {
  const { modelId } = Route.useParams();
  return <InteractivePage name={modelId} />;
}
