import { createFileRoute, redirect } from '@tanstack/react-router';

/** `/models/:modelId` has no page of its own; open the default mode. */
export const Route = createFileRoute('/models/$modelId/')({
  beforeLoad: ({ params }) => {
    throw redirect({ to: '/models/$modelId/interactive', params, replace: true });
  },
});
