import { setupServer } from 'msw/node';

export const TEST_BASE_URL = 'http://lume.test';
export const CANOPY_TEST_BASE_URL = 'http://canopy.test';
export const CANOPY_TEST_API_KEY = 'test-key';

/** Shared MSW server; register per-test handlers with `server.use(...)`. */
export const server = setupServer();
