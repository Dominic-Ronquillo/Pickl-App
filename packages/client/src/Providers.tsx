import { useState, type ReactNode } from 'react';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { createQueryClient } from './queryClient';
import { AuthProvider } from './auth/AuthProvider';
import type { Side } from './types';

/** Data and sign-in providers shared by both apps. */
export function Providers({ side, children, client }: { side: Side; children: ReactNode; client?: QueryClient }) {
  const [queryClient] = useState(() => client ?? createQueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider side={side}>{children}</AuthProvider>
    </QueryClientProvider>
  );
}
