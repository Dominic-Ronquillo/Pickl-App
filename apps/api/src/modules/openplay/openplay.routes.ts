import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/http.js';
import { validate } from '../../middleware/validate.js';
import { getSession, joinSession, leaveSession, listSessions } from './openplay.service.js';
import { getLineups } from '../games/games.service.js';
import { queueRouter } from '../queue/queue.routes.js';

/** Player-facing open play. Mounted at /api/open-play */
export const openPlayRouter = Router();

const listQuery = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  level: z.enum(['ALL', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED']).optional(),
  venueId: z.string().optional(),
});

openPlayRouter.get(
  '/sessions',
  validate({ query: listQuery }),
  asyncHandler(async (req, res) => {
    const q = req.query as z.infer<typeof listQuery>;
    const from = q.from ?? new Date();
    const to = q.to ?? new Date(from.getTime() + 7 * 86400_000);
    res.json(await listSessions({ from, to, level: q.level, venueId: q.venueId }, req.user!.id));
  }),
);

openPlayRouter.get('/sessions/:sessionId', asyncHandler(async (req, res) => {
  res.json(await getSession(req.params.sessionId, req.user!.id));
}));

openPlayRouter.post('/sessions/:sessionId/join', asyncHandler(async (req, res) => {
  res.status(201).json(await joinSession(req.params.sessionId, req.user!.id));
}));

openPlayRouter.post('/sessions/:sessionId/leave', asyncHandler(async (req, res) => {
  res.json(await leaveSession(req.params.sessionId, req.user!.id));
}));

openPlayRouter.get('/sessions/:sessionId/lineups', asyncHandler(async (req, res) => {
  res.json(await getLineups(req.params.sessionId));
}));

openPlayRouter.use('/sessions/:sessionId/queue', queueRouter);
