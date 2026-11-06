import { createFileRoute } from '@tanstack/react-router';
import Streaming from '../../../components/StreamingPage';

export const Route = createFileRoute('/models/$modelId/streaming')({
  component: StreamingMode,
});

function StreamingMode() {
  const { modelId } = Route.useParams();
  return <Streaming name={modelId} />;
}
