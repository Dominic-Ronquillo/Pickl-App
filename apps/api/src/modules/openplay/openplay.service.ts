import { Prisma, type PaymentMethod, type SessionStatus, type SkillLevel } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { conflict, HttpError, notFound } from '../../lib/http.js';
import { emit, RT } from '../../realtime/socket.js';
import { queue } from '../queue/queue.service.js';

const ACTIVE_REG = ['JOINED', 'CHECKED_IN'] as const;

export async function listSessions(f: { from: Date; to: Date; level?: SkillLevel; venueId?: string }, viewerId?: string) {
  const sessions = await prisma.openPlaySession.findMany({
    where: {
      status: { in: ['SCHEDULED', 'LIVE'] },
      endsAt: { gte: f.from },
      startsAt: { lte: f.to },
      ...(f.level ? { skillLevel: f.level } : {}),
      ...(f.venueId ? { venueId: f.venueId } : {}),
    },
    orderBy: { startsAt: 'asc' },
    include: {
      venue: { select: { id: true, name: true } },
      _count: { select: { courts: true, registrations: { where: { status: { in: [...ACTIVE_REG] } } } } },
      registrations: viewerId ? { where: { userId: viewerId, status: { in: [...ACTIVE_REG] } }, select: { status: true } } : false,
    },
  });
  return sessions.map(({ _count, registrations, ...s }) => ({
    ...s,
    courtCount: _count.courts,
    playerCount: _count.registrations,
    spotsLeft: Math.max(0, s.capacity - _count.registrations),
    myStatus: registrations?.[0]?.status ?? null,
  }));
}

export async function getSession(sessionId: string, viewerId?: string) {
  const s = await prisma.openPlaySession.findUnique({
    where: { id: sessionId },
    include: {
      venue: { select: { id: true, name: true, address: true } },
      courts: { include: { court: { select: { id: true, number: true, name: true } } } },
      registrations: {
        where: { status: { in: [...ACTIVE_REG] } },
        orderBy: { joinedAt: 'asc' },
        select: { status: true, user: { select: { id: true, name: true, rating: true } } },
      },
    },
  });
  if (!s) throw notFound('Session');
  const { registrations, courts, ...rest } = s;
  return {
    ...rest,
    courts: courts.map((c) => c.court).sort((a, b) => a.number - b.number),
    players: registrations.map((r) => ({ ...r.user, checkedIn: r.status === 'CHECKED_IN' })),
    playerCount: registrations.length,
    spotsLeft: Math.max(0, s.capacity - registrations.length),
    myStatus: registrations.find((r) => r.user.id === viewerId)?.status ?? null,
  };
}

export interface CreateSessionInput {
  title?: string;
  startsAt: Date;
  endsAt: Date;
  skillLevel: SkillLevel;
  minRating?: number;
  maxRating?: number;
  capacity: number;
  feeCents: number;
  courtIds: string[];
}

/** Creates the session and blocks its courts so they can't be booked during open play. */
export async function createSession(venueId: string, staffId: string, input: CreateSessionInput) {
  if (input.endsAt <= input.startsAt) throw new HttpError(422, 'End time must be after start time', 'BAD_RANGE');
  const session = await prisma.$transaction(
    async (tx) => {
      const courts = await tx.court.findMany({ where: { id: { in: input.courtIds }, venueId, isActive: true } });
      if (courts.length !== input.courtIds.length) throw new HttpError(422, 'One or more courts aren’t at this venue', 'BAD_COURT');

      const clash = await tx.booking.findFirst({
        where: {
          courtId: { in: input.courtIds },
          status: { in: ['PENDING', 'CONFIRMED'] },
          startsAt: { lt: input.endsAt },
          endsAt: { gt: input.startsAt },
        },
        include: { court: { select: { number: true } } },
      });
      if (clash) throw conflict(`Court ${clash.court.number} has a booking during that time`, 'COURT_BOOKED');

      const { courtIds, ...data } = input;
      const created = await tx.openPlaySession.create({
        data: { ...data, venueId, createdById: staffId, courts: { create: courtIds.map((courtId) => ({ courtId })) } },
      });
      await tx.courtBlock.createMany({
        data: courtIds.map((courtId) => ({
          courtId, startsAt: input.startsAt, endsAt: input.endsAt, reason: 'OPEN_PLAY' as const, sessionId: created.id, createdById: staffId,
        })),
      });
      return created;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
  emit.venue(venueId, RT.SCHEDULE_CHANGED, { sessionId: session.id });
  return session;
}

export async function setSessionStatus(venueId: string, sessionId: string, status: SessionStatus) {
  const s = await prisma.openPlaySession.findFirst({ where: { id: sessionId, venueId } });
  if (!s) throw notFound('Session');
  const updated = await prisma.$transaction(async (tx) => {
    if (status === 'CANCELLED') await tx.courtBlock.deleteMany({ where: { sessionId } });
    if (status === 'ENDED') {
      await tx.game.updateMany({ where: { sessionId, status: 'IN_PROGRESS' }, data: { status: 'ABANDONED', endedAt: new Date() } });
      await tx.openPlayRegistration.updateMany({ where: { sessionId, status: 'JOINED' }, data: { status: 'NO_SHOW' } });
    }
    return tx.openPlaySession.update({ where: { id: sessionId }, data: { status } });
  });
  emit.session(sessionId, RT.SESSION_UPDATED, { status });
  emit.venue(venueId, RT.SCHEDULE_CHANGED, { sessionId });
  return updated;
}

/** Player joins. Capacity is enforced inside a serializable transaction. */
export async function joinSession(sessionId: string, userId: string) {
  const reg = await prisma.$transaction(
    async (tx) => {
      const s = await tx.openPlaySession.findUnique({ where: { id: sessionId } });
      if (!s) throw notFound('Session');
      if (!['SCHEDULED', 'LIVE'].includes(s.status) || s.endsAt <= new Date()) {
        throw new HttpError(422, 'This session isn’t taking players', 'SESSION_CLOSED');
      }
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { rating: true } });
      if ((s.minRating && user.rating.lt(s.minRating)) || (s.maxRating && user.rating.gt(s.maxRating))) {
        throw new HttpError(422, `This session is for ratings ${s.minRating ?? ''}–${s.maxRating ?? ''}`, 'RATING_OUT_OF_RANGE');
      }
      const count = await tx.openPlayRegistration.count({ where: { sessionId, status: { in: [...ACTIVE_REG] } } });
      const existing = await tx.openPlayRegistration.findUnique({ where: { sessionId_userId: { sessionId, userId } } });
      if (existing && ACTIVE_REG.includes(existing.status as (typeof ACTIVE_REG)[number])) return existing;
      if (count >= s.capacity) throw conflict('This session is full', 'SESSION_FULL');

      // Fee collection: with online payments, mark paymentStatus from the payment webhook.
      return tx.openPlayRegistration.upsert({
        where: { sessionId_userId: { sessionId, userId } },
        create: { sessionId, userId },
        update: { status: 'JOINED', leftAt: null, checkedInAt: null, joinedAt: new Date() },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
  emit.session(sessionId, RT.SESSION_UPDATED, { type: 'joined', userId });
  return reg;
}

export async function leaveSession(sessionId: string, userId: string) {
  const reg = await prisma.openPlayRegistration.findUnique({ where: { sessionId_userId: { sessionId, userId } } });
  if (!reg || !ACTIVE_REG.includes(reg.status as (typeof ACTIVE_REG)[number])) throw notFound('Registration');
  const updated = await prisma.openPlayRegistration.update({ where: { id: reg.id }, data: { status: 'LEFT', leftAt: new Date() } });
  await queue.onLeave(sessionId, userId);
  emit.session(sessionId, RT.SESSION_UPDATED, { type: 'left', userId });
  return updated;
}

/** Staff checks a player in at the front desk, optionally recording payment. */
export async function checkIn(venueId: string, sessionId: string, userId: string, staffId: string, paidWith?: PaymentMethod) {
  const reg = await prisma.openPlayRegistration.findFirst({
    where: { sessionId, userId, session: { venueId } },
    include: { session: { select: { feeCents: true } } },
  });
  if (!reg) throw notFound('Registration');
  const updated = await prisma.$transaction(async (tx) => {
    if (paidWith && reg.paymentStatus !== 'PAID') {
      await tx.payment.create({
        data: { registrationId: reg.id, payerId: userId, amountCents: reg.session.feeCents, method: paidWith, recordedById: staffId },
      });
    }
    return tx.openPlayRegistration.update({
      where: { id: reg.id },
      data: { status: 'CHECKED_IN', checkedInAt: new Date(), ...(paidWith ? { paymentStatus: 'PAID' } : {}) },
    });
  });
  await queue.onCheckIn(sessionId, userId);
  emit.session(sessionId, RT.SESSION_UPDATED, { type: 'checked-in', userId });
  emit.venue(venueId, RT.SESSION_UPDATED, { sessionId, type: 'checked-in', userId });
  return updated;
}

export async function undoCheckIn(venueId: string, sessionId: string, userId: string) {
  const reg = await prisma.openPlayRegistration.findFirst({ where: { sessionId, userId, session: { venueId }, status: 'CHECKED_IN' } });
  if (!reg) throw notFound('Check-in');
  const updated = await prisma.openPlayRegistration.update({ where: { id: reg.id }, data: { status: 'JOINED', checkedInAt: null } });
  await queue.onLeave(sessionId, userId);
  emit.venue(venueId, RT.SESSION_UPDATED, { sessionId, type: 'check-in-undone', userId });
  return updated;
}

export async function getRoster(venueId: string, sessionId: string) {
  const s = await prisma.openPlaySession.findFirst({ where: { id: sessionId, venueId } });
  if (!s) throw notFound('Session');
  return prisma.openPlayRegistration.findMany({
    where: { sessionId, status: { in: [...ACTIVE_REG] } },
    orderBy: { joinedAt: 'asc' },
    select: { id: true, status: true, paymentStatus: true, checkedInAt: true, user: { select: { id: true, name: true, rating: true, phone: true } } },
  });
}
