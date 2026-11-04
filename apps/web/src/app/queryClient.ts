import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/api';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // Don't retry what won't change on retry (4xx); do retry network blips and 5xx.
        retry: (count, error) => !(error instanceof ApiError && error.status >= 400 && error.status < 500) && count < 2,
      },
    },
  });
}
