// Runs before every Vitest test file (see `test.setupFiles` in vite.config.ts).
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { server, TEST_BASE_URL } from './server';

vi.stubEnv('VITE_LUME_API_BASE_URL', TEST_BASE_URL);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());
