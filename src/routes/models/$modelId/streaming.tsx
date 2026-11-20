import { createFileRoute } from '@tanstack/react-router';
import StreamingPage from '@pages/StreamingPage';

/** Live model evaluations from lume-model-api's live stream. */
export const Route = createFileRoute('/models/$modelId/streaming')({
  component: StreamingPage,
});
