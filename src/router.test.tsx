import { QueryClientProvider } from '@tanstack/react-query';
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import type { ConfigResponse } from './api/types';
import { createAppRouter } from './router';
import { server, TEST_BASE_URL } from './test/server';
import { createTestQueryClient } from './test/utils';

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
  it('redirects / to the model list, which links to each model', async () => {
    server.use(
      http.get(api('/models'), () =>
        HttpResponse.json([{ name: 'demo', version: '1', description: '' }])
      )
    );
    const router = renderAt('/');
    const link = await screen.findByRole('link', { name: 'demo' });
    expect(router.state.location.pathname).toBe('/models');
    expect(link.getAttribute('href')).toBe('/models/demo');
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
    await screen.findByRole('heading', { name: 'Live stream' });
    expect(screen.getByText('Idle')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Streaming' }).dataset.status).toBe('active');
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
  });
});
