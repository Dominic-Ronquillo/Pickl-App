import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { conflict, HttpError, notFound } from '../../lib/http.js';
import { emit, RT } from '../../realtime/socket.js';
import { queue } from '../queue/queue.service.js';

const playerSelect = { team: true, user: { select: { id: true, name: true } } } as const;

/** Lineups screen: every session court with its live game, plus the "Up next" groups from the queue. */
export async function getLineups(sessionId: string) {
  const session = await prisma.openPlaySession.findUnique({
    where: { id: sessionId },
    include: {
      venue: { select: { id: true, name: true } },
      courts: { include: { court: { select: { id: true, number: true, name: true } } } },
      games: { where: { status: 'IN_PROGRESS' }, include: { players: { select: playerSelect } } },
    },
  });
  if (!session) throw notFound('Session');

  const groups = await queue.peekNextGroups(sessionId, 3);
  const ids = [...new Set(groups.flat())];
  const users = ids.length
    ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
    : [];
  const byId = new Map(users.map((u) => [u.id, u]));

  return {
    session: {
      id: session.id,
      status: session.status,
      startsAt: session.startsAt,
      endsAt: session.endsAt,
      venue: session.venue,
    },
    courts: session.courts
      .map(({ court }) => {
        const g = session.games.find((x) => x.courtId === court.id);
        return {
          ...court,
          game: g && {
            id: g.id,
            sequence: g.sequence,
            scoreA: g.scoreA,
            scoreB: g.scoreB,
            startedAt: g.startedAt,
            teamA: g.players.filter((p) => p.team === 'A').map((p) => p.user),
            teamB: g.players.filter((p) => p.team === 'B').map((p) => p.user),
          },
        };
      })
      .sort((a, b) => a.number - b.number),
    upNext: groups.map((g) => ({
      teamA: g.slice(0, 2).map((id) => byId.get(id)),
      teamB: g.slice(2, 4).map((id) => byId.get(id)),
    })),
    queueReady: true,
  };
}

export interface StartGameInput {
  courtId: string;
  /** Leave both teams out to pull the next group from the queue. */
  teamA?: [string, string];
  teamB?: [string, string];
}

export async function startGame(venueId: string, sessionId: string, input: StartGameInput) {
  let players: string[];
  if (input.teamA && input.teamB) players = [...input.teamA, ...input.teamB];
  else {
    const next = await queue.pickNextGroup(sessionId, input.courtId);
    if (!next)
      throw new HttpError(409, 'No group is ready in the queue. Pick the four players instead.', 'QUEUE_EMPTY');
    players = next;
  }
  if (new Set(players).size !== 4) throw new HttpError(422, 'A game needs four different players', 'BAD_LINEUP');

  const game = await prisma.$transaction(
    async (tx) => {
      const session = await tx.openPlaySession.findFirst({
        where: { id: sessionId, venueId },
        include: { courts: { where: { courtId: input.courtId } } },
      });
      if (!session) throw notFound('Session');
      if (session.status !== 'LIVE')
        throw new HttpError(422, 'Start the session before starting games', 'SESSION_NOT_LIVE');
      if (!session.courts.length) throw new HttpError(422, 'That court isn’t part of this session', 'BAD_COURT');

      const busyCourt = await tx.game.findFirst({ where: { courtId: input.courtId, status: 'IN_PROGRESS' } });
      if (busyCourt) throw conflict('That court already has a game in progress', 'COURT_BUSY');

      const checkedIn = await tx.openPlayRegistration.count({
        where: { sessionId, userId: { in: players }, status: 'CHECKED_IN' },
      });
      if (checkedIn !== 4) throw new HttpError(422, 'All four players must be checked in', 'NOT_CHECKED_IN');

      const busyPlayer = await tx.gamePlayer.findFirst({
        where: { userId: { in: players }, game: { status: 'IN_PROGRESS' } },
        include: { user: { select: { name: true } } },
      });
      if (busyPlayer) throw conflict(`${busyPlayer.user.name} is already on a court`, 'PLAYER_BUSY');

      const sequence = (await tx.game.count({ where: { sessionId } })) + 1;
      return tx.game.create({
        data: {
          sessionId,
          courtId: input.courtId,
          sequence,
          players: { create: players.map((userId, i) => ({ userId, team: i < 2 ? ('A' as const) : ('B' as const) })) },
        },
        include: { players: { select: playerSelect }, court: { select: { number: true } } },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  await queue.onGameStarted(sessionId, game.id);
  for (const p of game.players)
    emit.user(p.user.id, RT.YOUR_TURN, { sessionId, courtNumber: game.court.number, gameId: game.id });
  emit.session(sessionId, RT.LINEUP_UPDATED, await getLineups(sessionId));
  return game;
}

async function findVenueGame(venueId: string, gameId: string) {
  const game = await prisma.game.findFirst({ where: { id: gameId, court: { venueId } } });
  if (!game) throw notFound('Game');
  return game;
}

export async function updateScore(venueId: string, gameId: string, scoreA: number, scoreB: number) {
  const game = await findVenueGame(venueId, gameId);
  if (game.status !== 'IN_PROGRESS') throw new HttpError(422, 'This game has ended', 'GAME_ENDED');
  const updated = await prisma.game.update({ where: { id: gameId }, data: { scoreA, scoreB } });
  if (game.sessionId) emit.session(game.sessionId, RT.GAME_SCORE, { gameId, courtId: game.courtId, scoreA, scoreB });
  return updated;
}

export async function endGame(venueId: string, gameId: string, scoreA: number, scoreB: number) {
  const game = await findVenueGame(venueId, gameId);
  if (game.status !== 'IN_PROGRESS') throw new HttpError(422, 'This game has already ended', 'GAME_ENDED');
  const updated = await prisma.game.update({
    where: { id: gameId },
    data: { scoreA, scoreB, status: 'COMPLETED', endedAt: new Date() },
  });
  // TODO: update player ratings here once a rating formula is chosen.
  if (game.sessionId) {
    await queue.onGameEnded(game.sessionId, gameId);
    emit.session(game.sessionId, RT.LINEUP_UPDATED, await getLineups(game.sessionId));
  }
  return updated;
}
