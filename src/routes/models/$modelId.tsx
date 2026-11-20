import { createFileRoute, notFound } from '@tanstack/react-router';
import { LumeApiError } from '@api/client';
import { lumeQueries } from '@api/lume-model/queries';
import ModelNotFound from '@pages/ModelNotFound';
import ModelLayout from '@layouts/ModelLayout';
import { type NavigationContext, navItem } from '@/navigation';

/** Layout shared by every mode of a model: `/models/:modelId/*`. */
export const Route = createFileRoute('/models/$modelId')({
  beforeLoad: ({ params: { modelId } }): NavigationContext => ({
    navigation: [
      navItem('Home', { to: '/' }),
      navItem('Models', { to: '/models' }),
      navItem('Overview', { to: '/models/$modelId', params: { modelId } }),
      navItem('Interactive', { to: '/models/$modelId/interactive', params: { modelId } }),
      navItem('Streaming', { to: '/models/$modelId/streaming', params: { modelId } }),
      navItem('Canopy', { to: '/models/$modelId/canopy', params: { modelId } }),
    ],
  }),
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
