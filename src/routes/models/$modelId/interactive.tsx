import { createFileRoute } from '@tanstack/react-router';
import InteractivePage from '@pages/InteractivePage';

export const Route = createFileRoute('/models/$modelId/interactive')({
  component: InteractivePage,
});
