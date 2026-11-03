import { createFileRoute } from '@tanstack/react-router';
import ModelConfig from '../../../components/ModelConfig';

export const Route = createFileRoute('/models/$modelId/interactive')({
  component: InteractiveMode,
});

function InteractiveMode() {
  const { modelId } = Route.useParams();
  return <ModelConfig name={modelId} />;
}
