import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler, conflict, notFound } from '../../lib/http.js';
import { validate } from '../../middleware/validate.js';
import { ALL_STAFF, MANAGERS, requireVenueRole } from '../../middleware/auth.js';
import { venueToday } from '../../lib/time.js';
import { emit, RT } from '../../realtime/socket.js';
import { cancelBookingAsStaff, createBooking, markBookingPaid } from '../bookings/bookings.service.js';
import {
  checkIn,
  createSession,
  getRoster,
  listSessions,
  setSessionStatus,
  undoCheckIn,
} from '../openplay/openplay.service.js';
import { endGame, startGame, updateScore } from '../games/games.service.js';
import { getDashboard, getSchedule } from './dashboard.service.js';

/**
 * Venue (business) side. Mounted at /api/business/venues/:venueId
 * Every route requires the signed-in user to be staff at that venue.
 */
export const businessRouter = Router({ mergeParams: true });
businessRouter.use(requireVenueRole(...ALL_STAFF));

const dateQuery = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});
const paymentMethod = z.enum(['CASH', 'GCASH', 'MAYA', 'CARD']);

async function dateOrToday(venueId: string, date?: string) {
  if (date) return date;
  const v = await prisma.venue.findUniqueOrThrow({ where: { id: venueId }, select: { timezone: true } });
  return venueToday(v.timezone);
}

// ---------- Dashboard and schedule ----------

businessRouter.get(
  '/dashboard',
  validate({ query: dateQuery }),
  asyncHandler(async (req, res) => {
    const { date } = req.query as z.infer<typeof dateQuery>;
    res.json(await getDashboard(req.params.venueId, await dateOrToday(req.params.venueId, date)));
  }),
);

businessRouter.get(
  '/schedule',
  validate({ query: dateQuery }),
  asyncHandler(async (req, res) => {
    const { date } = req.query as z.infer<typeof dateQuery>;
    res.json(await getSchedule(req.params.venueId, await dateOrToday(req.params.venueId, date)));
  }),
);

// ---------- Court blocks (maintenance, events) ----------

const blockBody = z.object({
  courtId: z.string(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  reason: z.enum(['MAINTENANCE', 'EVENT']),
  note: z.string().max(200).optional(),
});

businessRouter.post(
  '/blocks',
  validate({ body: blockBody }),
  asyncHandler(async (req, res) => {
    const b = req.body as z.infer<typeof blockBody>;
    const court = await prisma.court.findFirst({ where: { id: b.courtId, venueId: req.params.venueId } });
    if (!court) throw notFound('Court');
    const clash = await prisma.booking.findFirst({
      where: {
        courtId: b.courtId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        startsAt: { lt: b.endsAt },
        endsAt: { gt: b.startsAt },
      },
    });
    if (clash) throw conflict(`Court ${court.number} has a booking then. Cancel or move it first.`, 'COURT_BOOKED');
    const block = await prisma.courtBlock.create({ data: { ...b, createdById: req.user!.id } });
    emit.venue(req.params.venueId, RT.SCHEDULE_CHANGED, { courtId: b.courtId });
    res.status(201).json(block);
  }),
);

businessRouter.delete(
  '/blocks/:blockId',
  asyncHandler(async (req, res) => {
    const block = await prisma.courtBlock.findFirst({
      where: { id: req.params.blockId, court: { venueId: req.params.venueId }, reason: { not: 'OPEN_PLAY' } },
    });
    if (!block) throw notFound('Block');
    await prisma.courtBlock.delete({ where: { id: block.id } });
    emit.venue(req.params.venueId, RT.SCHEDULE_CHANGED, { courtId: block.courtId });
    res.status(204).end();
  }),
);

// ---------- Bookings ----------

const bookingsQuery = z.object({ filter: z.enum(['upcoming', 'unpaid', 'cancelled']).default('upcoming') });

businessRouter.get(
  '/bookings',
  validate({ query: bookingsQuery }),
  asyncHandler(async (req, res) => {
    const { filter } = req.query as z.infer<typeof bookingsQuery>;
    const where =
      filter === 'cancelled'
        ? { status: 'CANCELLED' as const }
        : {
            status: { in: ['PENDING' as const, 'CONFIRMED' as const] },
            endsAt: { gte: new Date() },
            ...(filter === 'unpaid' ? { paymentStatus: 'UNPAID' as const } : {}),
          };
    const bookings = await prisma.booking.findMany({
      where: { venueId: req.params.venueId, ...where },
      orderBy: { startsAt: filter === 'cancelled' ? 'desc' : 'asc' },
      take: 100,
      include: { court: { select: { number: true } }, user: { select: { id: true, name: true, phone: true } } },
    });
    res.json(bookings);
  }),
);

const walkInBody = z.object({
  courtId: z.string(),
  startsAt: z.coerce.date(),
  durationMinutes: z.union([z.literal(60), z.literal(90), z.literal(120)]),
  guestName: z.string().trim().min(1).max(80).default('Walk-in'),
  userId: z.string().optional(),
  paidWith: paymentMethod.optional(),
});

businessRouter.post(
  '/bookings',
  validate({ body: walkInBody }),
  asyncHandler(async (req, res) => {
    const b = req.body as z.infer<typeof walkInBody>;
    const court = await prisma.court.findFirst({ where: { id: b.courtId, venueId: req.params.venueId } });
    if (!court) throw notFound('Court');
    let booking = await createBooking({
      courtId: b.courtId,
      startsAt: b.startsAt,
      durationMinutes: b.durationMinutes,
      userId: b.userId,
      guestName: b.guestName,
      source: 'WALK_IN',
      createdById: req.user!.id,
    });
    if (b.paidWith)
      booking = { ...booking, ...(await markBookingPaid(booking.id, req.params.venueId, req.user!.id, b.paidWith)) };
    res.status(201).json(booking);
  }),
);

businessRouter.post(
  '/bookings/:bookingId/paid',
  validate({ body: z.object({ method: paymentMethod }) }),
  asyncHandler(async (req, res) => {
    res.json(await markBookingPaid(req.params.bookingId, req.params.venueId, req.user!.id, req.body.method));
  }),
);

businessRouter.post(
  '/bookings/:bookingId/cancel',
  validate({ body: z.object({ reason: z.string().max(200).optional() }) }),
  asyncHandler(async (req, res) => {
    res.json(await cancelBookingAsStaff(req.params.bookingId, req.params.venueId, req.body.reason));
  }),
);

// ---------- Open play ----------

businessRouter.get(
  '/open-play/sessions',
  validate({ query: dateQuery }),
  asyncHandler(async (req, res) => {
    const { date } = req.query as z.infer<typeof dateQuery>;
    const from = date ? new Date(`${date}T00:00:00Z`) : new Date();
    res.json(await listSessions({ from, to: new Date(from.getTime() + 7 * 86400_000), venueId: req.params.venueId }));
  }),
);

const sessionBody = z
  .object({
    title: z.string().max(80).optional(),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    skillLevel: z.enum(['ALL', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
    minRating: z.number().min(1).max(8).optional(),
    maxRating: z.number().min(1).max(8).optional(),
    capacity: z.number().int().min(4).max(200),
    feeCents: z.number().int().min(0),
    courtIds: z.array(z.string()).min(1),
  })
  .refine((v) => v.endsAt > v.startsAt, { message: 'End time must be after start time', path: ['endsAt'] });

businessRouter.post(
  '/open-play/sessions',
  requireVenueRole(...MANAGERS),
  validate({ body: sessionBody }),
  asyncHandler(async (req, res) => {
    res.status(201).json(await createSession(req.params.venueId, req.user!.id, req.body));
  }),
);

businessRouter.patch(
  '/open-play/sessions/:sessionId/status',
  validate({ body: z.object({ status: z.enum(['LIVE', 'ENDED', 'CANCELLED']) }) }),
  asyncHandler(async (req, res) => {
    res.json(await setSessionStatus(req.params.venueId, req.params.sessionId, req.body.status));
  }),
);

businessRouter.get(
  '/open-play/sessions/:sessionId/roster',
  asyncHandler(async (req, res) => {
    res.json(await getRoster(req.params.venueId, req.params.sessionId));
  }),
);

businessRouter.post(
  '/open-play/sessions/:sessionId/check-ins',
  validate({ body: z.object({ userId: z.string(), paidWith: paymentMethod.optional() }) }),
  asyncHandler(async (req, res) => {
    res.json(await checkIn(req.params.venueId, req.params.sessionId, req.body.userId, req.user!.id, req.body.paidWith));
  }),
);

businessRouter.delete(
  '/open-play/sessions/:sessionId/check-ins/:userId',
  asyncHandler(async (req, res) => {
    res.json(await undoCheckIn(req.params.venueId, req.params.sessionId, req.params.userId));
  }),
);

// ---------- Games (lineups and scores) ----------

const startGameBody = z.object({
  courtId: z.string(),
  teamA: z.tuple([z.string(), z.string()]).optional(),
  teamB: z.tuple([z.string(), z.string()]).optional(),
});

businessRouter.post(
  '/open-play/sessions/:sessionId/games',
  validate({ body: startGameBody }),
  asyncHandler(async (req, res) => {
    res.status(201).json(await startGame(req.params.venueId, req.params.sessionId, req.body));
  }),
);

const scoreBody = z.object({ scoreA: z.number().int().min(0).max(99), scoreB: z.number().int().min(0).max(99) });

businessRouter.patch(
  '/games/:gameId/score',
  validate({ body: scoreBody }),
  asyncHandler(async (req, res) => {
    res.json(await updateScore(req.params.venueId, req.params.gameId, req.body.scoreA, req.body.scoreB));
  }),
);

businessRouter.post(
  '/games/:gameId/end',
  validate({ body: scoreBody }),
  asyncHandler(async (req, res) => {
    res.json(await endGame(req.params.venueId, req.params.gameId, req.body.scoreA, req.body.scoreB));
  }),
);

// ---------- Venue settings (managers) ----------

businessRouter.patch(
  '/courts/:courtId',
  requireVenueRole(...MANAGERS),
  validate({ body: z.object({ name: z.string().min(1).max(40).optional(), isActive: z.boolean().optional() }) }),
  asyncHandler(async (req, res) => {
    const court = await prisma.court.findFirst({ where: { id: req.params.courtId, venueId: req.params.venueId } });
    if (!court) throw notFound('Court');
    res.json(await prisma.court.update({ where: { id: court.id }, data: req.body }));
  }),
);

const pricingBody = z.array(
  z.object({
    dayOfWeek: z.number().int().min(0).max(6).nullable(),
    startMinute: z.number().int().min(0).max(1439),
    endMinute: z.number().int().min(1).max(1440),
    centsPerHour: z.number().int().min(0),
    priority: z.number().int().default(0),
  }),
);

businessRouter.put(
  '/pricing',
  requireVenueRole(...MANAGERS),
  validate({ body: pricingBody }),
  asyncHandler(async (req, res) => {
    const venueId = req.params.venueId;
    const rules = req.body as z.infer<typeof pricingBody>;
    await prisma.$transaction([
      prisma.pricingRule.deleteMany({ where: { venueId } }),
      prisma.pricingRule.createMany({ data: rules.map((r) => ({ ...r, venueId })) }),
    ]);
    res.json(await prisma.pricingRule.findMany({ where: { venueId } }));
  }),
);
