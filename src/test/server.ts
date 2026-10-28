import { setupServer } from 'msw/node';

export const TEST_BASE_URL = 'http://lume.test';

/** Shared MSW server; register per-test handlers with `server.use(...)`. */
export const server = setupServer();
