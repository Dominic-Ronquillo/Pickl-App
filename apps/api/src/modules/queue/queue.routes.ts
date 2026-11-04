import { Router } from 'express';
import { asyncHandler } from '../../lib/http.js';
import { queue } from './queue.service.js';

/** Mounted at /api/open-play/sessions/:sessionId/queue */
export const queueRouter = Router({ mergeParams: true });

queueRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(await queue.getQueue(req.params.sessionId));
  }),
);

queueRouter.get(
  '/me',
  asyncHandler(async (req, res) => {
    res.json(await queue.getPosition(req.params.sessionId, req.user!.id));
  }),
);
