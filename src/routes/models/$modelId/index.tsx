import { createFileRoute } from '@tanstack/react-router';
import ModelIndexPage from '@pages/ModelIndexPage';

export const Route = createFileRoute('/models/$modelId/')({
  component: ModelIndexPage,
});
