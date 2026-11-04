/**
 * Open play rotation rules (pure functions, no database).
 *
 * Based on the "paddle stack" rotation most venues post (see docs/queue-rules.md):
 *   - 2 on / 2 off while the queue is short: winners stay, split up, and face the next
 *     two players in line; losers go to the back of the line.
 *   - Winners may stay at most `maxConsecutiveGames` games in a row, then everyone comes off.
 *   - 4 on / 4 off once `fourOffThreshold` or more players are waiting: all four come off.
 */
export interface RotationConfig {
  /** Waiting players at which every game becomes 4 on / 4 off. */
  fourOffThreshold: number;
  /** Most games a player can play in a row before they must come off, even after a win. */
  maxConsecutiveGames: number;
  /** Used only for the wait estimate. */
  avgGameMinutes: number;
}

export const DEFAULT_ROTATION: RotationConfig = { fourOffThreshold: 8, maxConsecutiveGames: 2, avgGameMinutes: 15 };

export type RotationMode = 'TWO_OFF' | 'FOUR_OFF';

export const rotationMode = (waitingCount: number, cfg: RotationConfig): RotationMode =>
  waitingCount >= cfg.fourOffThreshold ? 'FOUR_OFF' : 'TWO_OFF';

export interface FinishedGame {
  scoreA: number;
  scoreB: number;
  /** `streak` = consecutive games the player had played on this court before this one. */
  players: { userId: string; team: 'A' | 'B'; streak: number }[];
}

export interface AfterGameDecision {
  /** Winners who stay on the court for the next game, with their updated streak. */
  stay: { userId: string; streak: number }[];
  /** Players going to the back of the queue, in the order their paddles go down. */
  off: string[];
}

export function decideAfterGame(game: FinishedGame, waitingCount: number, cfg: RotationConfig): AfterGameDecision {
  const winner = game.scoreA === game.scoreB ? null : game.scoreA > game.scoreB ? 'A' : 'B';
  const winners = game.players.filter((p) => p.team === winner);
  const losers = game.players.filter((p) => p.team !== winner);
  const mode = rotationMode(waitingCount, cfg);

  const stay: AfterGameDecision['stay'] = [];
  const winnersOff: string[] = [];
  for (const p of winners) {
    const streak = p.streak + 1;
    if (mode === 'TWO_OFF' && streak < cfg.maxConsecutiveGames) stay.push({ userId: p.userId, streak });
    else winnersOff.push(p.userId);
  }
  return { stay, off: [...losers.map((p) => p.userId), ...winnersOff] };
}

/**
 * The next four for one court as [teamA1, teamA2, teamB1, teamB2].
 * Players staying on are split across the two teams; the rest come from the front of the line.
 */
export function buildGroup(staying: string[], waiting: string[]): string[] | null {
  const need = 4 - staying.length;
  if (need < 0 || waiting.length < need) return null;
  const fresh = waiting.slice(0, need);
  if (staying.length === 2) return [staying[0], fresh[0], staying[1], fresh[1]];
  return [...staying, ...fresh];
}

/** "Up next" preview: courts with players staying on are filled first, then groups of four. */
export function previewGroups(stayingByCourt: string[][], waiting: string[], count: number): string[][] {
  const groups: string[][] = [];
  let rest = waiting;
  for (const staying of [...stayingByCourt, ...Array<string[]>(count).fill([])]) {
    if (groups.length >= count) break;
    const g = buildGroup(staying, rest);
    if (!g) continue;
    groups.push(g);
    rest = rest.slice(4 - staying.length);
  }
  return groups;
}

/** Rough minutes until a player at `position` (1-based) gets on a court. */
export function estimateWaitMinutes(position: number, courts: number, waitingCount: number, cfg: RotationConfig) {
  if (courts <= 0) return null;
  const spotsPerRotation = courts * (rotationMode(waitingCount, cfg) === 'FOUR_OFF' ? 4 : 2);
  return Math.floor((position - 1) / spotsPerRotation) * cfg.avgGameMinutes;
}

/**
 * Wait estimate for each waiting player, consistent with the "Up next" groups:
 * players already in a next group wait 0; everyone else waits at least one game, counted from
 * their place among the players not yet grouped.
 */
export function estimateWaits(waiting: string[], upNext: string[], courts: number, cfg: RotationConfig) {
  if (courts <= 0) return waiting.map(() => null);
  const next = new Set(upNext);
  let behind = 0;
  return waiting.map((id) => {
    if (next.has(id)) return 0;
    behind += 1;
    return estimateWaitMinutes(behind, courts, waiting.length, cfg)! + cfg.avgGameMinutes;
  });
}
