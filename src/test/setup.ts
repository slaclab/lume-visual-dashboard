// Runs before every Vitest test file (see `test.setupFiles` in vite.config.ts).
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { CANOPY_TEST_API_KEY, CANOPY_TEST_BASE_URL, server, TEST_BASE_URL } from './server';

vi.stubEnv('VITE_LUME_API_BASE_URL', TEST_BASE_URL);
vi.stubEnv('VITE_CANOPY_API_BASE_URL', CANOPY_TEST_BASE_URL);
vi.stubEnv('VITE_CANOPY_API_KEY', CANOPY_TEST_API_KEY);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());
