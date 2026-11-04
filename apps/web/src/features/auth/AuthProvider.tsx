import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, tokenStore, UNAUTHORIZED_EVENT } from '@/lib/api';
import { disconnectRealtime } from '@/lib/realtime';
import type { Mode, SessionPayload, StaffVenue, User } from '@/types/api';
import { AuthContext, type AuthContextValue } from './auth-context';

const SESSION_KEY = 'courtside.session';

interface StoredSession {
  user: User;
  venues: StaffVenue[];
  mode: Mode;
}

function loadSession(): StoredSession | null {
  if (!tokenStore.get()) return null;
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null');
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<StoredSession | null>(loadSession);

  const save = useCallback((next: StoredSession | null) => {
    if (next) localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    else localStorage.removeItem(SESSION_KEY);
    setSession(next);
  }, []);

  const accept = useCallback(
    (payload: SessionPayload, mode: Mode) => {
      disconnectRealtime();
      tokenStore.set(payload.token);
      queryClient.clear();
      save({ user: payload.user, venues: payload.venues, mode });
    },
    [queryClient, save],
  );

  const signOut = useCallback(() => {
    disconnectRealtime();
    tokenStore.clear();
    queryClient.clear();
    save(null);
  }, [queryClient, save]);

  useEffect(() => {
    window.addEventListener(UNAUTHORIZED_EVENT, signOut);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, signOut);
  }, [signOut]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      venues: session?.venues ?? [],
      mode: session?.mode ?? 'player',
      async signIn({ email, password, as }) {
        accept(await api<SessionPayload>('/auth/login', { method: 'POST', body: { email, password, as } }), as);
      },
      async register(input) {
        accept(await api<SessionPayload>('/auth/register', { method: 'POST', body: input }), 'player');
      },
      signOut,
      setMode(mode) {
        if (session && (mode === 'player' || session.venues.length)) save({ ...session, mode });
      },
    }),
    [session, accept, signOut, save],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
