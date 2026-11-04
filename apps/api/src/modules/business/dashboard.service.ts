import { prisma } from '../../lib/prisma.js';
import { notFound } from '../../lib/http.js';
import { overlaps, venueDayBounds, venueLocal } from '../../lib/time.js';

/** Venue dashboard for one day: revenue, hourly revenue, court use, counts and live court status. */
export async function getDashboard(venueId: string, date: string) {
  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
    include: { courts: { where: { isActive: true }, orderBy: { number: 'asc' } } },
  });
  if (!venue) throw notFound('Venue');
  const tz = venue.timezone;
  const { start, end } = venueDayBounds(date, tz);
  const inDay = { startsAt: { lt: end }, endsAt: { gt: start } };

  const [bookings, blocks, sessions, payments, liveGames] = await Promise.all([
    prisma.booking.findMany({
      where: { venueId, status: { in: ['CONFIRMED', 'COMPLETED'] }, ...inDay },
      include: { user: { select: { name: true } } },
    }),
    prisma.courtBlock.findMany({ where: { court: { venueId }, ...inDay } }),
    prisma.openPlaySession.findMany({
      where: { venueId, status: { not: 'CANCELLED' }, ...inDay },
      include: { _count: { select: { registrations: { where: { status: 'CHECKED_IN' } } } } },
    }),
    prisma.payment.findMany({
      where: {
        status: 'PAID',
        createdAt: { gte: start, lt: end },
        OR: [{ booking: { venueId } }, { registration: { session: { venueId } } }],
      },
      select: { amountCents: true, createdAt: true },
    }),
    prisma.game.findMany({
      where: { status: 'IN_PROGRESS', court: { venueId } },
      select: { courtId: true, sequence: true, scoreA: true, scoreB: true },
    }),
  ]);

  // Revenue by local hour, from recorded payments.
  const hourly = Array.from({ length: 24 }, (_, h) => ({ hour: h, cents: 0 }));
  for (const p of payments) hourly[Math.floor(venueLocal(p.createdAt, tz).minute / 60)].cents += p.amountCents;

  // Court use = booked + open play minutes / available court minutes.
  const openMinutes = (venue.closesAtMinute - venue.opensAtMinute) * venue.courts.length;
  const clip = (s: Date, e: Date) =>
    Math.max(0, (Math.min(e.getTime(), end.getTime()) - Math.max(s.getTime(), start.getTime())) / 60_000);
  const usedMinutes =
    bookings.reduce((n, b) => n + clip(b.startsAt, b.endsAt), 0) +
    blocks.filter((b) => b.reason === 'OPEN_PLAY').reduce((n, b) => n + clip(b.startsAt, b.endsAt), 0);

  const now = new Date();
  const courtsNow = venue.courts.map((c) => {
    const game = liveGames.find((g) => g.courtId === c.id);
    const block = blocks.find((b) => b.courtId === c.id && overlaps(b.startsAt, b.endsAt, now, now));
    const booking = bookings.find((b) => b.courtId === c.id && b.startsAt <= now && b.endsAt > now);
    const status = block?.reason === 'OPEN_PLAY' ? 'OPEN_PLAY' : block ? 'BLOCKED' : booking ? 'BOOKED' : 'FREE';
    return {
      courtId: c.id,
      number: c.number,
      status,
      game: game ?? null,
      booking: booking
        ? { id: booking.id, name: booking.user?.name ?? booking.guestName, endsAt: booking.endsAt }
        : null,
    };
  });

  return {
    date,
    revenueCents: payments.reduce((n, p) => n + p.amountCents, 0),
    hourlyRevenue: hourly.filter((h) => h.hour * 60 >= venue.opensAtMinute && h.hour * 60 < venue.closesAtMinute),
    courtUsePercent: openMinutes ? Math.round((usedMinutes / openMinutes) * 100) : 0,
    bookingCount: bookings.length,
    checkInCount: sessions.reduce((n, s) => n + s._count.registrations, 0),
    courtsNow,
  };
}

/** Schedule grid for staff: everything occupying each court that day, with names. */
export async function getSchedule(venueId: string, date: string) {
  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
    include: { courts: { orderBy: { number: 'asc' } } },
  });
  if (!venue) throw notFound('Venue');
  const { start, end } = venueDayBounds(date, venue.timezone);
  const inDay = { startsAt: { lt: end }, endsAt: { gt: start } };
  const [bookings, blocks] = await Promise.all([
    prisma.booking.findMany({
      where: { venueId, status: { in: ['PENDING', 'CONFIRMED'] }, ...inDay },
      select: {
        id: true,
        courtId: true,
        startsAt: true,
        endsAt: true,
        guestName: true,
        paymentStatus: true,
        source: true,
        totalCents: true,
        user: { select: { id: true, name: true } },
      },
    }),
    prisma.courtBlock.findMany({
      where: { court: { venueId }, ...inDay },
      select: { id: true, courtId: true, startsAt: true, endsAt: true, reason: true, note: true, sessionId: true },
    }),
  ]);
  return {
    date,
    opensAtMinute: venue.opensAtMinute,
    closesAtMinute: venue.closesAtMinute,
    courts: venue.courts.map((c) => ({
      id: c.id,
      number: c.number,
      name: c.name,
      isActive: c.isActive,
      items: [
        ...bookings
          .filter((b) => b.courtId === c.id)
          .map((b) => ({ type: 'BOOKING' as const, ...b, name: b.user?.name ?? b.guestName ?? 'Walk-in' })),
        ...blocks.filter((b) => b.courtId === c.id).map((b) => ({ type: b.reason, ...b })),
      ].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime()),
    })),
  };
}
