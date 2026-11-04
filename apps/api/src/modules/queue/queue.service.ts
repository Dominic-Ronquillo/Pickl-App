import { prisma } from '../../lib/prisma.js';
import { notFound } from '../../lib/http.js';
import type { QueueEntryView, QueueStrategy } from './queue.types.js';
import { buildGroup, decideAfterGame, DEFAULT_ROTATION, estimateWaitMinutes, previewGroups } from './rotation.js';

const cfg = DEFAULT_ROTATION;

const waitingIds = async (sessionId: string, take?: number) =>
  (
    await prisma.queueEntry.findMany({
      where: { sessionId, status: 'WAITING' },
      orderBy: { enteredAt: 'asc' },
      select: { userId: true },
      take,
    })
  ).map((e) => e.userId);

/** Paddle-stack rotation backed by the QueueEntry table. */
export const paddleStackQueue: QueueStrategy = {
  async onCheckIn(sessionId, userId) {
    // Re-checking in keeps an existing place in line.
    await prisma.queueEntry.upsert({
      where: { sessionId_userId: { sessionId, userId } },
      create: { sessionId, userId },
      update: {},
    });
  },

  async onLeave(sessionId, userId) {
    await prisma.queueEntry.deleteMany({ where: { sessionId, userId } });
  },

  async onGameStarted(sessionId, gameId) {
    const game = await prisma.game.findUniqueOrThrow({ where: { id: gameId }, include: { players: true } });
    const ids = game.players.map((p) => p.userId);
    await prisma.$transaction([
      // Winners held for this court who weren't picked go back to the front of the line.
      prisma.queueEntry.updateMany({
        where: { sessionId, status: 'HOLDING', courtId: game.courtId, userId: { notIn: ids } },
        data: { status: 'WAITING', courtId: null, streak: 0 },
      }),
      ...ids.map((userId) =>
        prisma.queueEntry.upsert({
          where: { sessionId_userId: { sessionId, userId } },
          create: { sessionId, userId, status: 'PLAYING', courtId: game.courtId },
          update: { status: 'PLAYING', courtId: game.courtId },
        }),
      ),
    ]);
  },

  async onGameEnded(sessionId, gameId) {
    const game = await prisma.game.findUniqueOrThrow({ where: { id: gameId }, include: { players: true } });
    const entries = await prisma.queueEntry.findMany({
      where: { sessionId, userId: { in: game.players.map((p) => p.userId) } },
    });
    const byUser = new Map(entries.map((e) => [e.userId, e]));
    const waiting = await prisma.queueEntry.count({ where: { sessionId, status: 'WAITING' } });

    const decision = decideAfterGame(
      {
        scoreA: game.scoreA,
        scoreB: game.scoreB,
        // Players who left mid-game have no entry and simply drop out.
        players: game.players
          .filter((p) => byUser.has(p.userId))
          .map((p) => ({ userId: p.userId, team: p.team, streak: byUser.get(p.userId)!.streak })),
      },
      waiting,
      cfg,
    );

    const now = Date.now();
    await prisma.$transaction([
      ...decision.stay.map(({ userId, streak }) =>
        prisma.queueEntry.update({
          where: { sessionId_userId: { sessionId, userId } },
          data: { status: 'HOLDING', courtId: game.courtId, streak },
        }),
      ),
      // One millisecond apart keeps the order the paddles went down.
      ...decision.off.map((userId, i) =>
        prisma.queueEntry.update({
          where: { sessionId_userId: { sessionId, userId } },
          data: { status: 'WAITING', courtId: null, streak: 0, enteredAt: new Date(now + i) },
        }),
      ),
    ]);
  },

  async pickNextGroup(sessionId, courtId) {
    const staying = await prisma.queueEntry.findMany({
      where: { sessionId, status: 'HOLDING', courtId },
      orderBy: { enteredAt: 'asc' },
      select: { userId: true },
    });
    return buildGroup(
      staying.map((e) => e.userId),
      await waitingIds(sessionId, 4),
    );
  },

  async peekNextGroups(sessionId, count) {
    const holding = await prisma.queueEntry.findMany({
      where: { sessionId, status: 'HOLDING' },
      orderBy: [{ courtId: 'asc' }, { enteredAt: 'asc' }],
      select: { userId: true, courtId: true },
    });
    const byCourt = new Map<string, string[]>();
    for (const h of holding) byCourt.set(h.courtId!, [...(byCourt.get(h.courtId!) ?? []), h.userId]);
    return previewGroups([...byCourt.values()], await waitingIds(sessionId, count * 4), count);
  },

  async getQueue(sessionId) {
    const session = await prisma.openPlaySession.findUnique({
      where: { id: sessionId },
      select: { _count: { select: { courts: true } } },
    });
    if (!session) throw notFound('Session');
    const entries = await prisma.queueEntry.findMany({
      where: { sessionId, status: 'WAITING' },
      orderBy: { enteredAt: 'asc' },
      select: { userId: true, enteredAt: true, user: { select: { name: true } } },
    });
    return entries.map((e, i): QueueEntryView => ({
      userId: e.userId,
      name: e.user.name,
      position: i + 1,
      joinedAt: e.enteredAt,
      estimatedWaitMinutes: estimateWaitMinutes(i + 1, session._count.courts, entries.length, cfg),
    }));
  },

  async getPosition(sessionId, userId) {
    return (await this.getQueue(sessionId)).find((e) => e.userId === userId) ?? null;
  },
};

export const queue: QueueStrategy = paddleStackQueue;
