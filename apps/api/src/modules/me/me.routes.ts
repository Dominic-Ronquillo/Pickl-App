import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler } from '../../lib/http.js';
import { validate } from '../../middleware/validate.js';
import { createVenueForOwner, venueSetupSchema } from '../venues/venue-setup.service.js';

/** Player home screen: profile, stats, upcoming bookings, recent games. */
export const meRouter = Router();

meRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.user!.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        rating: true,
        createdAt: true,
        staffRoles: { select: { venueId: true, role: true, venue: { select: { name: true } } } },
      },
    });
    res.json(user);
  }),
);

meRouter.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const games = await prisma.gamePlayer.findMany({
      where: { userId: req.user!.id, game: { status: 'COMPLETED' } },
      select: { team: true, game: { select: { scoreA: true, scoreB: true, endedAt: true } } },
    });
    const won = games.filter(({ team, game }) =>
      team === 'A' ? game.scoreA > game.scoreB : game.scoreB > game.scoreA,
    ).length;
    res.json({
      gamesTotal: games.length,
      gamesThisMonth: games.filter((g) => g.game.endedAt && g.game.endedAt >= monthStart).length,
      winRate: games.length ? Math.round((won / games.length) * 100) : null,
    });
  }),
);

meRouter.get(
  '/bookings',
  asyncHandler(async (req, res) => {
    const bookings = await prisma.booking.findMany({
      where: { userId: req.user!.id, status: { in: ['PENDING', 'CONFIRMED'] }, endsAt: { gte: new Date() } },
      orderBy: { startsAt: 'asc' },
      include: {
        court: { select: { number: true, name: true } },
        venue: { select: { id: true, name: true, latitude: true, longitude: true } },
      },
    });
    res.json(bookings);
  }),
);

meRouter.get(
  '/games',
  asyncHandler(async (req, res) => {
    const rows = await prisma.gamePlayer.findMany({
      where: { userId: req.user!.id, game: { status: 'COMPLETED' } },
      orderBy: { game: { endedAt: 'desc' } },
      take: 20,
      select: {
        team: true,
        game: {
          select: {
            id: true,
            scoreA: true,
            scoreB: true,
            endedAt: true,
            players: { select: { team: true, user: { select: { id: true, name: true } } } },
          },
        },
      },
    });
    res.json(
      rows.map(({ team, game }) => ({
        id: game.id,
        endedAt: game.endedAt,
        won: team === 'A' ? game.scoreA > game.scoreB : game.scoreB > game.scoreA,
        score: team === 'A' ? `${game.scoreA}-${game.scoreB}` : `${game.scoreB}-${game.scoreA}`,
        partners: game.players.filter((p) => p.team === team && p.user.id !== req.user!.id).map((p) => p.user),
        opponents: game.players.filter((p) => p.team !== team).map((p) => p.user),
      })),
    );
  }),
);

meRouter.get(
  '/open-play',
  asyncHandler(async (req, res) => {
    const regs = await prisma.openPlayRegistration.findMany({
      where: {
        userId: req.user!.id,
        status: { in: ['JOINED', 'CHECKED_IN'] },
        session: { endsAt: { gte: new Date() } },
      },
      include: { session: { include: { venue: { select: { id: true, name: true } } } } },
      orderBy: { session: { startsAt: 'asc' } },
    });
    res.json(regs);
  }),
);

/** A signed-in player registers a venue and becomes its owner ("Register your venue" in the profile). */
meRouter.post(
  '/venues',
  validate({ body: venueSetupSchema }),
  asyncHandler(async (req, res) => {
    const venue = await prisma.$transaction((tx) => createVenueForOwner(tx, req.user!.id, req.body));
    res.status(201).json({ venue: { ...venue, role: 'OWNER' } });
  }),
);
