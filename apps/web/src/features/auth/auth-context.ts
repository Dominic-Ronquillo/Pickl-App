import { createContext, useContext } from 'react';
import type { Mode, SkillLevel, StaffVenue, User } from '@/types/api';

export interface AuthContextValue {
  user: User | null;
  venues: StaffVenue[];
  mode: Mode;
  signIn(input: { email: string; password: string; as: Mode }): Promise<void>;
  register(input: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    skillLevel: SkillLevel;
  }): Promise<void>;
  signOut(): void;
  /** Owners and staff can switch between the player and venue sides. */
  setMode(mode: Mode): void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
