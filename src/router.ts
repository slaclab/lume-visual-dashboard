import type { QueryClient } from '@tanstack/react-query';
import { createRouter, type RouterHistory } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';

export interface CreateAppRouterOptions {
  /** Defaults to browser history; tests pass `createMemoryHistory(...)`. */
  history?: RouterHistory;
}

export function createAppRouter(
  queryClient: QueryClient,
  { history }: CreateAppRouterOptions = {}
) {
  return createRouter({
    routeTree,
    history,
    // Mirror Vite's `base` (e.g. `/lume-visual-dashboard/` in Dockerfile.prod) so
    // routes match and generated links keep the prefix when served under a subpath.
    basepath: import.meta.env.BASE_URL,
    context: { queryClient },
    // Hovering a link starts loading that route's data.
    defaultPreload: 'intent',
    // TanStack Query owns caching, so always let loaders call `ensureQueryData`.
    defaultPreloadStaleTime: 0,
    scrollRestoration: true,
  });
}

// Makes `Link`, `useNavigate`, `Route.useParams`, etc. type-check against our route tree.
declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
