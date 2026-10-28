import { QueryClient } from '@tanstack/react-query';
import { LumeApiError } from './client';

const MAX_RETRIES = 2;

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // 4xx (bad ids, out-of-range inputs) will never succeed on retry; 5xx/network may.
        retry: (failureCount, error) =>
          !(error instanceof LumeApiError && error.isClientError) && failureCount < MAX_RETRIES,
        refetchOnWindowFocus: false,
      },
    },
  });
}

export const queryClient = createQueryClient();
