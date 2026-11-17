import type { QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext } from '@tanstack/react-router';
import '@/App.css';
import RootLayout from '@layouts/RootLayout';
import NotFound from '@components/pages/NotFound';

/** Available to every route's `beforeLoad`/`loader` as `context`. */
export interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFound,
});
