import { Theme } from '@carbon/react';
import { Link, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';

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
export default RootLayout;
