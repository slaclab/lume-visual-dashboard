import type { QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext } from '@tanstack/react-router';
import '@/App.css';
import RootLayout from '@layouts/RootLayout';
import NotFound from '@pages/NotFound';
import { type NavigationContext, navItem } from '@/navigation';

/** Available to every route's `beforeLoad`/`loader` as `context`. */
export interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: (): NavigationContext => ({
    navigation: [navItem('Home', { to: '/' }), navItem('Models', { to: '/models' })],
  }),
  component: RootLayout,
  notFoundComponent: NotFound,
});
