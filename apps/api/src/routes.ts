import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { requireAuth } from './middleware/auth.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { meRouter } from './modules/me/me.routes.js';
import { venuesRouter } from './modules/venues/venues.routes.js';
import { bookingsRouter } from './modules/bookings/bookings.routes.js';
import { openPlayRouter } from './modules/openplay/openplay.routes.js';
import { businessRouter } from './modules/business/business.routes.js';

export const api = Router();

/** Liveness + database readiness, for load balancers and uptime checks. */
api.get('/health', async (_req, res) => {
  const database = await prisma.$queryRaw`SELECT 1`.then(
    () => 'up' as const,
    () => 'down' as const,
  );
  res
    .status(database === 'up' ? 200 : 503)
    .json({ ok: database === 'up', database, uptime: Math.round(process.uptime()) });
});

const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: env.AUTH_RATE_LIMIT,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many attempts. Try again in a few minutes.' } },
});
api.use('/auth', authLimiter, authRouter);

// Everything below needs a signed-in user.
api.use(requireAuth);

// Player side
api.use('/me', meRouter);
api.use('/venues', venuesRouter);
api.use('/bookings', bookingsRouter);
api.use('/open-play', openPlayRouter);

// Business side
api.use('/business/venues/:venueId', businessRouter);
