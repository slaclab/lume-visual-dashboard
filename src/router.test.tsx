import { QueryClientProvider } from '@tanstack/react-query';
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import type { ConfigResponse } from '@api/lume-model/types';
import { createAppRouter } from '@/router';
import { server, TEST_BASE_URL } from '@test/server';
import { createTestQueryClient } from '@test/utils';

const api = (path: string) => `${TEST_BASE_URL}/api/v1${path}`;

const config: ConfigResponse = {
  model: 'demo',
  version: '1',
  description: 'Demo model',
  inputs: [],
  outputs: [],
  screens: [],
};

function renderAt(path: string) {
  const queryClient = createTestQueryClient();
  const router = createAppRouter(queryClient, {
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
  return router;
}

describe('routes', () => {
  it('renders the drag-and-drop dashboard at /', async () => {
    const router = renderAt('/');
    await screen.findByRole('heading', { name: 'Drag and Drop Area' });
    expect(router.state.location.pathname).toBe('/');
  });

  it('lists the models at /models, linking to each model', async () => {
    server.use(
      http.get(api('/models'), () =>
        HttpResponse.json([{ name: 'demo', version: '1', description: '' }])
      )
    );
    renderAt('/models');
    const link = await screen.findByRole('link', { name: 'demo' });
    expect(link.getAttribute('href')).toBe('/models/demo');
  });

  it('renders the SWAPPS header, whose title navigates client-side to the dashboard', async () => {
    server.use(http.get(api('/models/demo/config'), () => HttpResponse.json(config)));
    const router = renderAt('/models/demo');
    await screen.findByText('Demo model');
    const banner = screen.getByRole('banner', { name: 'SLAC LUME Visual Dashboard' });
    const home = within(banner).getByRole('link', { name: /LUME Visual Dashboard/ });
    expect(home.getAttribute('href')).toBe('/');
    expect(screen.getByRole('main').id).toBe('main-content');

    fireEvent.click(home);
    await screen.findByRole('heading', { name: 'Drag and Drop Area' });
    expect(router.state.location.pathname).toBe('/');
  });

  it('shows the model config at the model URL', async () => {
    server.use(http.get(api('/models/demo/config'), () => HttpResponse.json(config)));
    const router = renderAt('/models/demo');
    await screen.findByText('Demo model');
    expect(router.state.location.pathname).toBe('/models/demo');
    expect(screen.getByRole('heading', { name: 'Inputs' })).toBeTruthy();
  });

  it('renders streaming mode at its own URL', async () => {
    server.use(http.get(api('/models/demo/config'), () => HttpResponse.json(config)));
    renderAt('/models/demo/streaming');
    // The demo config has no outputs or screens, so the stream stays idle and makes no request.
    await screen.findByRole('heading', { name: 'Live stream (lume-model-api)' });
    expect(screen.getByText('Idle')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Streaming' }).dataset.status).toBe('active');
  });

  it('shows model modes in the header, marking only the current page active', async () => {
    server.use(http.get(api('/models/demo/config'), () => HttpResponse.json(config)));
    renderAt('/models/demo/canopy');
    await screen.findByRole('heading', { name: 'Live PVs (Canopy Hare)' });
    const header = screen.getByRole('navigation', { name: 'Main navigation' });
    const active = within(header)
      .getAllByRole('link')
      .filter((link) => link.dataset.status === 'active')
      .map((link) => link.textContent);
    expect(active).toEqual(['Canopy']);
    expect(within(header).getByRole('link', { name: 'Interactive' }).getAttribute('href')).toBe(
      '/models/demo/interactive'
    );
  });

  it('renders Canopy mode at its own URL', async () => {
    server.use(http.get(api('/models/demo/config'), () => HttpResponse.json(config)));
    renderAt('/models/demo/canopy');
    // The demo config has no inputs or outputs, so no PVs are subscribed.
    await screen.findByRole('heading', { name: 'Live PVs (Canopy Hare)' });
    expect(screen.getByText('Idle')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Canopy' }).dataset.status).toBe('active');
  });

  it('shows not found for an unknown model', async () => {
    server.use(
      http.get(api('/models/missing/config'), () =>
        HttpResponse.json({ detail: 'unknown model' }, { status: 404 })
      )
    );
    renderAt('/models/missing/interactive');
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Model “missing” was not found.');
    // The unknown model's modes aren't offered; the header falls back to the main links
    expect(screen.queryByRole('link', { name: 'Interactive' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Models' })).toBeTruthy();
  });
});
