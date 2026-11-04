/**
 * Open play queue contract.
 *
 * The rest of the backend talks to the queue ONLY through this interface:
 *   - open play calls onCheckIn / onLeave
 *   - games call takeNextGroup when a court frees up, and onGameEnded after a game
 *   - lineups call peekNextGroups for the "Up next" list
 *
 * When the queue rules are defined, implement QueueStrategy (plus its Prisma tables)
 * and swap it in at queue.service.ts. Nothing else needs to change.
 */
export interface QueueEntryView {
  userId: string;
  name: string;
  position: number;
  joinedAt: Date;
  estimatedWaitMinutes: number | null;
}

export interface QueueStrategy {
  /** A player checked in at the venue and can now be queued. */
  onCheckIn(sessionId: string, userId: string): Promise<void>;
  /** A player left the session or had their check-in undone. */
  onLeave(sessionId: string, userId: string): Promise<void>;
  /** A game finished; its players may re-enter the queue under the rotation rules. */
  onGameEnded(sessionId: string, gameId: string): Promise<void>;
  /** Next groups of 4 (team A = [0,1], team B = [2,3]) without removing them. */
  peekNextGroups(sessionId: string, count: number): Promise<string[][]>;
  /** Removes and returns the next group for a free court, or null if not enough players. */
  takeNextGroup(sessionId: string, courtId: string): Promise<string[] | null>;
  /** Full ordered queue for the session screen. */
  getQueue(sessionId: string): Promise<QueueEntryView[]>;
  /** Where one player stands, or null if they aren't queued. */
  getPosition(sessionId: string, userId: string): Promise<QueueEntryView | null>;
}
