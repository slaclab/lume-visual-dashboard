import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/models/$modelId/streaming')({
  component: StreamingMode,
});

function StreamingMode() {
  const { modelId } = Route.useParams();
  return <p>Streaming mode for {modelId} is not implemented yet.</p>;
}
