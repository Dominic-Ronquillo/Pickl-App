import { createContext, useContext } from 'react';
import type { Side, SkillLevel, StaffVenue, User } from '../types';

export interface AuthContextValue {
  /** Which app this is. */
  side: Side;
  user: User | null;
  /** Venues the user manages; empty for player-only accounts. */
  venues: StaffVenue[];
  signIn(input: { email: string; password: string }): Promise<void>;
  /** Player sign-up (player app only). */
  register(input: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    skillLevel: SkillLevel;
  }): Promise<void>;
  signOut(): void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
