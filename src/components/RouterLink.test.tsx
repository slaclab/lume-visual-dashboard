import { AppHeader } from '@swapps/ui';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
  useNavigate,
} from '@tanstack/react-router';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RouterLink } from '@components/RouterLink';

function Header() {
  const navigate = useNavigate();
  return (
    <AppHeader
      appTitle="App"
      homeHref="/"
      navigation={[
        { label: 'Models', href: '/models' },
        { label: 'About', href: '/about' },
      ]}
      actions={[{ label: 'New', href: '/about' }]}
      linkAs={RouterLink}
      onNavigate={(href) => navigate({ to: href })}
    />
  );
}

function renderHeaderAt(path: string, basepath?: string) {
  const rootRoute = createRootRoute({
    component: () => (
      <>
        <Header />
        <Outlet />
      </>
    ),
  });
  const page = (routePath: string) =>
    createRoute({ getParentRoute: () => rootRoute, path: routePath, component: () => routePath });
  const router = createRouter({
    routeTree: rootRoute.addChildren([page('/'), page('/models'), page('/about')]),
    history: createMemoryHistory({ initialEntries: [path] }),
    basepath,
  });
  render(<RouterProvider router={router} />);
  return router;
}

describe('RouterLink in the SWAPPS AppHeader', () => {
  it('navigates client-side and marks the current nav item', async () => {
    const router = renderHeaderAt('/models');
    const models = await screen.findByRole('link', { name: 'Models' });
    const about = screen.getByRole('link', { name: 'About' });
    expect(models.getAttribute('aria-current')).toBe('page');
    expect(models.classList.contains('cds--header__menu-item')).toBe(true);
    expect(about.getAttribute('aria-current')).toBeNull();

    fireEvent.click(about);
    await screen.findByText('/about');
    expect(router.state.location.pathname).toBe('/about');
    expect(about.getAttribute('aria-current')).toBe('page');
    expect(models.getAttribute('aria-current')).toBeNull();

    fireEvent.click(screen.getByRole('link', { name: /App/ }));
    await screen.findByText('/');
    expect(router.state.location.pathname).toBe('/');
  });

  it('routes href buttons through onNavigate', async () => {
    const router = renderHeaderAt('/models');
    fireEvent.click(await screen.findByLabelText('New'));
    await screen.findByText('/about');
    expect(router.state.location.pathname).toBe('/about');
  });

  it('adds the router basepath to the rendered hrefs', async () => {
    renderHeaderAt('/app/models', '/app');
    const models = await screen.findByRole('link', { name: 'Models' });
    expect(models.getAttribute('href')).toBe('/app/models');
    expect(screen.getByRole('link', { name: /App/ }).getAttribute('href')).toBe('/app/');
  });
});
