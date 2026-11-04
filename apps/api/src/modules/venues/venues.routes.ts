import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler, notFound } from '../../lib/http.js';
import { validate } from '../../middleware/validate.js';
import { venueToday } from '../../lib/time.js';
import { getAvailability } from './availability.service.js';

export const venuesRouter = Router();

venuesRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const venues = await prisma.venue.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true, address: true, latitude: true, longitude: true, _count: { select: { courts: { where: { isActive: true } } } } },
    });
    res.json(venues.map(({ _count, ...v }) => ({ ...v, courtCount: _count.courts })));
  }),
);

venuesRouter.get(
  '/:venueId',
  asyncHandler(async (req, res) => {
    const venue = await prisma.venue.findUnique({
      where: { id: req.params.venueId },
      include: { courts: { where: { isActive: true }, orderBy: { number: 'asc' } }, pricingRules: true },
    });
    if (!venue) throw notFound('Venue');
    res.json(venue);
  }),
);

const availabilityQuery = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() });

venuesRouter.get(
  '/:venueId/availability',
  validate({ query: availabilityQuery }),
  asyncHandler(async (req, res) => {
    const { date } = req.query as z.infer<typeof availabilityQuery>;
    const venue = await prisma.venue.findUnique({ where: { id: req.params.venueId }, select: { timezone: true } });
    if (!venue) throw notFound('Venue');
    res.json(await getAvailability(req.params.venueId, date ?? venueToday(venue.timezone), req.user?.id));
  }),
);
