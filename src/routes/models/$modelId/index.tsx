import { createFileRoute } from '@tanstack/react-router';
import ModelIndexPage from '@pages/ModelIndexPage';

/** `/models/:modelId` has no page of its own; open the default mode. */
export const Route = createFileRoute('/models/$modelId/')({
  component: ModelIndexPage,
});
