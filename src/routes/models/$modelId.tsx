import { createFileRoute, notFound } from '@tanstack/react-router';
import { LumeApiError } from '@api/client';
import { lumeQueries } from '@api/lume-model/queries';
import ModelNotFound from '@pages/ModelNotFound';
import ModelLayout from '@layouts/ModelLayout';

/** Layout shared by every mode of a model: `/models/:modelId/*`. */
export const Route = createFileRoute('/models/$modelId')({
  loader: async ({ context: { queryClient }, params: { modelId } }) => {
    try {
      await queryClient.query({ ...lumeQueries.config(modelId), staleTime: 'static' });
    } catch (error) {
      if (error instanceof LumeApiError && error.status === 404) throw notFound();
      throw error;
    }
  },
  component: ModelLayout,
  notFoundComponent: ModelNotFound,
});
