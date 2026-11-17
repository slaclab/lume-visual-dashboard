import { createFileRoute } from '@tanstack/react-router';
import { lumeQueries } from '@api/lume-model/queries';
import ModelSelection from '@components/ModelSelection';

export const Route = createFileRoute('/models/')({
  loader: ({ context: { queryClient } }) =>
    queryClient.query({ ...lumeQueries.models(), staleTime: 'static' }),
  component: ModelSelection,
});
