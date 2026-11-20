import { AppHeader, SWAPPSThemeProvider, type SWAPPSThemeConfig } from '@swapps/ui';
import { Outlet, useMatches } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { RouterLink } from '@components/RouterLink';

const themeConfig: SWAPPSThemeConfig = {
  appearance: 'dark',
  branding: { organizationName: 'SLAC' },
};

function RootLayout() {
  // Each route can set `navigation` in `beforeLoad`; the deepest one wins. Matches from a not-found
  // route down are skipped, so e.g. an unknown model shows the main links rather than its modes.
  const navigation = useMatches({
    select: (matches) => {
      const notFoundAt = matches.findIndex((match) => match.status === 'notFound');
      const found = notFoundAt === -1 ? matches : matches.slice(0, notFoundAt);
      return found.at(-1)?.context.navigation;
    },
  });
  return (
    <SWAPPSThemeProvider config={themeConfig}>
      <AppHeader
        appTitle="LUME Visual Dashboard"
        homeHref="/"
        linkAs={RouterLink}
        navigation={navigation}
      />
      <main id="main-content" className="app-main">
        <Outlet />
      </main>
      {/* Renders nothing outside development. React Query's devtools sit bottom-right. */}
      <TanStackRouterDevtools position="bottom-left" />
    </SWAPPSThemeProvider>
  );
}
export default RootLayout;
