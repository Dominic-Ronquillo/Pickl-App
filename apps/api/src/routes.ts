import { Router } from 'express';
import { requireAuth } from './middleware/auth.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { meRouter } from './modules/me/me.routes.js';
import { venuesRouter } from './modules/venues/venues.routes.js';
import { bookingsRouter } from './modules/bookings/bookings.routes.js';
import { openPlayRouter } from './modules/openplay/openplay.routes.js';
import { businessRouter } from './modules/business/business.routes.js';

export const api = Router();

api.get('/health', (_req, res) => res.json({ ok: true }));
api.use('/auth', authRouter);

// Everything below needs a signed-in user.
api.use(requireAuth);

// Player side
api.use('/me', meRouter);
api.use('/venues', venuesRouter);
api.use('/bookings', bookingsRouter);
api.use('/open-play', openPlayRouter);

// Business side
api.use('/business/venues/:venueId', businessRouter);
