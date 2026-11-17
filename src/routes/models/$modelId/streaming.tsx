import { createFileRoute } from '@tanstack/react-router';
import StreamingPage from '@components/pages/test/StreamingPage';

/** Live model evaluations from lume-model-api's live stream. */
export const Route = createFileRoute('/models/$modelId/streaming')({
  component: StreamingMode,
});

function StreamingMode() {
  const { modelId } = Route.useParams();
  return <StreamingPage name={modelId} source="lume" />;
}
