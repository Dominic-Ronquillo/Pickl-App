import { prisma } from '../../lib/prisma.js';
import { notFound } from '../../lib/http.js';
import { pickRule } from '../../lib/pricing.js';
import { addMinutes, atVenueMinute, overlaps, venueDayBounds, venueLocal } from '../../lib/time.js';

export type SlotStatus = 'OPEN' | 'BOOKED' | 'MINE' | 'BLOCKED' | 'OPEN_PLAY' | 'PAST';

/**
 * Builds the court-by-hour grid shown on the Book screen.
 * Each slot is one hour; the app combines consecutive OPEN slots for 2-hour bookings.
 */
export async function getAvailability(venueId: string, date: string, viewerId?: string) {
  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
    include: { courts: { where: { isActive: true }, orderBy: { number: 'asc' } }, pricingRules: true },
  });
  if (!venue) throw notFound('Venue');

  const { start, end } = venueDayBounds(date, venue.timezone);
  const courtIds = venue.courts.map((c) => c.id);
  const [bookings, blocks] = await Promise.all([
    prisma.booking.findMany({
      where: {
        courtId: { in: courtIds },
        status: { in: ['PENDING', 'CONFIRMED'] },
        startsAt: { lt: end },
        endsAt: { gt: start },
      },
      select: { courtId: true, startsAt: true, endsAt: true, userId: true },
    }),
    prisma.courtBlock.findMany({
      where: { courtId: { in: courtIds }, startsAt: { lt: end }, endsAt: { gt: start } },
      select: { courtId: true, startsAt: true, endsAt: true, reason: true },
    }),
  ]);

  const now = new Date();
  const slots = [];
  for (let m = venue.opensAtMinute; m + 60 <= venue.closesAtMinute; m += 60) {
    const s = atVenueMinute(date, m, venue.timezone);
    const e = addMinutes(s, 60);
    const { dow } = venueLocal(s, venue.timezone);
    const rule = pickRule(venue.pricingRules, dow, m);

    for (const court of venue.courts) {
      const b = bookings.find((x) => x.courtId === court.id && overlaps(s, e, x.startsAt, x.endsAt));
      const k = blocks.find((x) => x.courtId === court.id && overlaps(s, e, x.startsAt, x.endsAt));
      let status: SlotStatus = 'OPEN';
      if (b) status = viewerId && b.userId === viewerId ? 'MINE' : 'BOOKED';
      else if (k) status = k.reason === 'OPEN_PLAY' ? 'OPEN_PLAY' : 'BLOCKED';
      else if (s < now) status = 'PAST';
      slots.push({ courtId: court.id, startsAt: s, endsAt: e, status, priceCents: rule?.centsPerHour ?? null });
    }
  }

  return {
    venue: { id: venue.id, name: venue.name, timezone: venue.timezone },
    date,
    courts: venue.courts.map((c) => ({ id: c.id, number: c.number, name: c.name })),
    slots,
  };
}
