import { createFileRoute } from '@tanstack/react-router';
import StreamingPage from '../../../components/StreamingPage';

/** Live input and output PVs from Canopy's Hare WebSocket. */
export const Route = createFileRoute('/models/$modelId/canopy')({
  component: CanopyMode,
});

function CanopyMode() {
  const { modelId } = Route.useParams();
  return <StreamingPage name={modelId} source="canopy" />;
}
