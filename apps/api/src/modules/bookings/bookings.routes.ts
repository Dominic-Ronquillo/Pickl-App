import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/http.js';
import { validate } from '../../middleware/validate.js';
import { cancelOwnBooking, createBooking } from './bookings.service.js';

export const bookingsRouter = Router();

const createBody = z.object({
  courtId: z.string().min(1),
  startsAt: z.coerce.date(),
  durationMinutes: z.union([z.literal(60), z.literal(90), z.literal(120)]),
});

bookingsRouter.post(
  '/',
  validate({ body: createBody }),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof createBody>;
    const booking = await createBooking({ ...body, userId: req.user!.id, createdById: req.user!.id, source: 'APP' });
    res.status(201).json(booking);
  }),
);

const cancelBody = z.object({ reason: z.string().max(200).optional() });

bookingsRouter.post(
  '/:bookingId/cancel',
  validate({ body: cancelBody }),
  asyncHandler(async (req, res) => {
    res.json(await cancelOwnBooking(req.params.bookingId, req.user!.id, req.body.reason));
  }),
);
