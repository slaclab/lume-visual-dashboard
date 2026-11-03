import { Theme } from '@carbon/react';
import type { QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext, Link, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import '../App.css';

/** Available to every route's `beforeLoad`/`loader` as `context`. */
export interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFound,
});

function RootLayout() {
  return (
    <Theme theme="g100">
      <header>
        <h1>
          <Link to="/models">LUME Visual Dashboard</Link>
        </h1>
      </header>
      <main>
        <Outlet />
      </main>
      {/* Renders nothing outside development. React Query's devtools sit bottom-right. */}
      <TanStackRouterDevtools position="bottom-left" />
    </Theme>
  );
}

function NotFound() {
  return (
    <div role="alert">
      <p>Page not found.</p>
      <Link to="/models">Back to models</Link>
    </div>
  );
}
