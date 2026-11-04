import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { verifyToken } from '../middleware/auth.js';

/**
 * Rooms
 *   session:<sessionId>  players watching an open play session (lineups, scores, queue)
 *   venue:<venueId>      staff dashboards (bookings, court status, check-ins)
 *   user:<userId>        personal notifications ("you're up on Court 2")
 */
let io: Server | null = null;

export function initRealtime(server: HttpServer) {
  io = new Server(server, { cors: { origin: env.CORS_ORIGIN } });

  io.use((socket, next) => {
    try {
      socket.data.userId = verifyToken(String(socket.handshake.auth?.token ?? ''));
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.data.userId}`);
    socket.on('session:watch', (id: string) => socket.join(`session:${id}`));
    socket.on('session:unwatch', (id: string) => socket.leave(`session:${id}`));
    socket.on('venue:watch', async (venueId: string) => {
      const staff = await prisma.venueStaff.findUnique({
        where: { venueId_userId: { venueId, userId: socket.data.userId } },
      });
      if (staff) socket.join(`venue:${venueId}`);
    });
  });
}

export const RT = {
  LINEUP_UPDATED: 'lineup:updated',
  GAME_SCORE: 'game:score',
  SESSION_UPDATED: 'session:updated',
  BOOKING_CHANGED: 'booking:changed',
  SCHEDULE_CHANGED: 'schedule:changed',
  YOUR_TURN: 'queue:your-turn',
} as const;

export const emit = {
  session: (id: string, event: string, payload: unknown) => io?.to(`session:${id}`).emit(event, payload),
  venue: (id: string, event: string, payload: unknown) => io?.to(`venue:${id}`).emit(event, payload),
  user: (id: string, event: string, payload: unknown) => io?.to(`user:${id}`).emit(event, payload),
};
