import { AppHeader, SWAPPSThemeProvider, type SWAPPSThemeConfig } from '@swapps/ui';
import { Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { RouterLink } from '@components/RouterLink';

const themeConfig: SWAPPSThemeConfig = {
  appearance: 'dark',
  branding: { organizationName: 'SLAC' },
};

function RootLayout() {
  return (
    <SWAPPSThemeProvider config={themeConfig}>
      <AppHeader appTitle="LUME Visual Dashboard" homeHref="/models" linkAs={RouterLink} />
      <main id="main-content" className="app-main">
        <Outlet />
      </main>
      {/* Renders nothing outside development. React Query's devtools sit bottom-right. */}
      <TanStackRouterDevtools position="bottom-left" />
    </SWAPPSThemeProvider>
  );
}
export default RootLayout;
