import { useEffect } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { tokenStore } from './api';

/** Event names from apps/api/src/realtime/socket.ts */
export const RT = {
  LINEUP_UPDATED: 'lineup:updated',
  GAME_SCORE: 'game:score',
  SESSION_UPDATED: 'session:updated',
  YOUR_TURN: 'queue:your-turn',
} as const;

let socket: Socket | null = null;

/** One shared connection, opened lazily with the current token. */
function getSocket() {
  const token = tokenStore.get();
  if (!token) return null;
  if (!socket) socket = io(import.meta.env.VITE_API_URL || undefined, { auth: { token } });
  return socket;
}

export function disconnectRealtime() {
  socket?.disconnect();
  socket = null;
}

/**
 * Watches an open play session and refetches the given queries whenever the server says
 * the lineup, score or roster changed. The server stays the source of truth.
 */
export function useSessionLive(sessionId: string | undefined, keys: QueryKey[]) {
  const queryClient = useQueryClient();
  const keyHash = JSON.stringify(keys);

  useEffect(() => {
    const s = sessionId ? getSocket() : null;
    if (!s || !sessionId) return;
    const refresh = () =>
      (JSON.parse(keyHash) as QueryKey[]).forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
    const watch = () => s.emit('session:watch', sessionId);
    watch();
    s.on('connect', watch); // re-join the room after a reconnect
    s.on(RT.LINEUP_UPDATED, refresh);
    s.on(RT.GAME_SCORE, refresh);
    s.on(RT.SESSION_UPDATED, refresh);
    return () => {
      s.emit('session:unwatch', sessionId);
      s.off('connect', watch);
      s.off(RT.LINEUP_UPDATED, refresh);
      s.off(RT.GAME_SCORE, refresh);
      s.off(RT.SESSION_UPDATED, refresh);
    };
  }, [sessionId, keyHash, queryClient]);
}
