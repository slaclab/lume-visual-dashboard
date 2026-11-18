import { createFileRoute } from '@tanstack/react-router';
import { lumeQueries } from '@api/lume-model/queries';
import ModelsIndexPage from '@pages/ModelsIndexPage';

export const Route = createFileRoute('/models/')({
  loader: ({ context: { queryClient } }) =>
    queryClient.query({ ...lumeQueries.models(), staleTime: 'static' }),
  component: ModelsIndexPage,
});
