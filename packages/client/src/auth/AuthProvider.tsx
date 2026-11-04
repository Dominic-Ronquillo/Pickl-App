import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, tokenStore, UNAUTHORIZED_EVENT } from '../api';
import { disconnectRealtime } from '../realtime';
import type { Side, SessionPayload, StaffVenue, User } from '../types';
import { AuthContext, type AuthContextValue } from './auth-context';

const SESSION_KEY = 'courtside.session';

interface StoredSession {
  user: User;
  venues: StaffVenue[];
}

function loadSession(): StoredSession | null {
  if (!tokenStore.get()) return null;
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null');
  } catch {
    return null;
  }
}

/**
 * Sign-in state for one app. `side` is which app this is: the player app signs in as a player,
 * the venue app as venue staff (the API refuses accounts that don't manage a venue).
 */
export function AuthProvider({ side, children }: { side: Side; children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<StoredSession | null>(loadSession);

  const save = useCallback((next: StoredSession | null) => {
    if (next) localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    else localStorage.removeItem(SESSION_KEY);
    setSession(next);
  }, []);

  const accept = useCallback(
    (payload: SessionPayload) => {
      disconnectRealtime();
      tokenStore.set(payload.token);
      queryClient.clear();
      save({ user: payload.user, venues: payload.venues });
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
      side,
      user: session?.user ?? null,
      venues: session?.venues ?? [],
      async signIn({ email, password }) {
        accept(await api<SessionPayload>('/auth/login', { method: 'POST', body: { email, password, as: side } }));
      },
      async register(input) {
        accept(await api<SessionPayload>('/auth/register', { method: 'POST', body: input }));
      },
      signOut,
    }),
    [side, session, accept, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
