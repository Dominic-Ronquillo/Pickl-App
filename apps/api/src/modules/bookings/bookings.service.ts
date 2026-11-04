import { Prisma, type BookingSource, type PaymentMethod } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { conflict, forbidden, HttpError, notFound } from '../../lib/http.js';
import { priceRange } from '../../lib/pricing.js';
import { addMinutes, venueLocal } from '../../lib/time.js';
import { emit, RT } from '../../realtime/socket.js';

export interface CreateBookingInput {
  courtId: string;
  startsAt: Date;
  durationMinutes: number;
  createdById: string;
  userId?: string | null;
  guestName?: string;
  source?: BookingSource;
}

/**
 * Creates a court booking. Two layers of protection against double-booking:
 *  1. a serializable transaction that checks bookings and blocks first (friendly errors), and
 *  2. the Postgres exclusion constraint (catches anything that races past step 1).
 */
export async function createBooking(input: CreateBookingInput) {
  const endsAt = addMinutes(input.startsAt, input.durationMinutes);

  const booking = await prisma.$transaction(
    async (tx) => {
      const court = await tx.court.findUnique({
        where: { id: input.courtId },
        include: { venue: { include: { pricingRules: true } } },
      });
      if (!court || !court.isActive) throw notFound('Court');
      const { venue } = court;

      if (input.startsAt < new Date()) throw new HttpError(422, 'That time has already passed', 'IN_PAST');
      const s = venueLocal(input.startsAt, venue.timezone);
      const e = venueLocal(endsAt, venue.timezone);
      if (s.date !== e.date && e.minute !== 0) throw new HttpError(422, 'Bookings can’t run past midnight', 'OUT_OF_HOURS');
      const endMinute = e.minute === 0 && s.date !== e.date ? 1440 : e.minute;
      if (s.minute < venue.opensAtMinute || endMinute > venue.closesAtMinute) {
        throw new HttpError(422, 'That time is outside the venue’s opening hours', 'OUT_OF_HOURS');
      }

      const where = { courtId: court.id, startsAt: { lt: endsAt }, endsAt: { gt: input.startsAt } };
      const [clash, block] = await Promise.all([
        tx.booking.findFirst({ where: { ...where, status: { in: ['PENDING', 'CONFIRMED'] } } }),
        tx.courtBlock.findFirst({ where }),
      ]);
      if (clash) throw conflict(`Court ${court.number} is already booked at that time`, 'SLOT_TAKEN');
      if (block) {
        throw conflict(
          block.reason === 'OPEN_PLAY' ? `Court ${court.number} is reserved for open play then` : `Court ${court.number} is closed then`,
          'COURT_BLOCKED',
        );
      }

      return tx.booking.create({
        data: {
          venueId: venue.id,
          courtId: court.id,
          userId: input.userId ?? null,
          guestName: input.guestName,
          startsAt: input.startsAt,
          endsAt,
          source: input.source ?? 'APP',
          totalCents: priceRange(venue.pricingRules, venue.timezone, input.startsAt, endsAt),
          createdById: input.createdById,
          // Online payments: create as PENDING and confirm from the payment webhook instead.
          status: 'CONFIRMED',
        },
        include: { court: { select: { number: true } } },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  emit.venue(booking.venueId, RT.BOOKING_CHANGED, { type: 'created', booking });
  emit.venue(booking.venueId, RT.SCHEDULE_CHANGED, { courtId: booking.courtId });
  return booking;
}

/** Player cancels their own booking. Staff cancel through cancelBookingAsStaff. */
export async function cancelOwnBooking(bookingId: string, userId: string, reason?: string) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw notFound('Booking');
  if (booking.userId !== userId) throw forbidden('This isn’t your booking');
  if (booking.startsAt <= new Date()) throw new HttpError(422, 'This booking has already started', 'ALREADY_STARTED');
  return setCancelled(booking.id, booking.venueId, reason);
}

export async function cancelBookingAsStaff(bookingId: string, venueId: string, reason?: string) {
  const booking = await prisma.booking.findFirst({ where: { id: bookingId, venueId } });
  if (!booking) throw notFound('Booking');
  return setCancelled(booking.id, venueId, reason);
}

async function setCancelled(id: string, venueId: string, reason?: string) {
  const booking = await prisma.booking.update({
    where: { id },
    data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason },
  });
  // TODO: apply the venue's refund policy here once it's decided.
  emit.venue(venueId, RT.BOOKING_CHANGED, { type: 'cancelled', booking });
  emit.venue(venueId, RT.SCHEDULE_CHANGED, { courtId: booking.courtId });
  return booking;
}

export async function markBookingPaid(bookingId: string, venueId: string, staffId: string, method: PaymentMethod) {
  const booking = await prisma.booking.findFirst({ where: { id: bookingId, venueId } });
  if (!booking) throw notFound('Booking');
  if (booking.paymentStatus === 'PAID') return booking;
  const [, updated] = await prisma.$transaction([
    prisma.payment.create({
      data: { bookingId, payerId: booking.userId, amountCents: booking.totalCents, method, recordedById: staffId },
    }),
    prisma.booking.update({ where: { id: bookingId }, data: { paymentStatus: 'PAID' } }),
  ]);
  emit.venue(venueId, RT.BOOKING_CHANGED, { type: 'paid', booking: updated });
  return updated;
}
