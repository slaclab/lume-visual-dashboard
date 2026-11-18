import { createFileRoute } from '@tanstack/react-router';
import CanopyStreamingPage from '@pages/CanopyStreamingPage';

/** Live input and output PVs from Canopy's Hare WebSocket. */
export const Route = createFileRoute('/models/$modelId/canopy')({
  component: CanopyStreamingPage,
});
