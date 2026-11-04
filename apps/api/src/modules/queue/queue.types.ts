/**
 * Open play queue contract.
 *
 * The rest of the backend talks to the queue ONLY through this interface:
 *   - open play calls onCheckIn / onLeave
 *   - games call pickNextGroup when a court frees up, onGameStarted once the game exists,
 *     and onGameEnded after a game
 *   - lineups call peekNextGroups for the "Up next" list
 *
 * The rotation rules themselves are pure functions in rotation.ts.
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
  /** A game was created on a court; its players are now on court. */
  onGameStarted(sessionId: string, gameId: string): Promise<void>;
  /** A game finished; its players stay on or re-enter the queue under the rotation rules. */
  onGameEnded(sessionId: string, gameId: string): Promise<void>;
  /** Next groups of 4 (team A = [0,1], team B = [2,3]) without changing the queue. */
  peekNextGroups(sessionId: string, count: number): Promise<string[][]>;
  /**
   * The group for a free court, or null if not enough players are waiting.
   * Doesn't change the queue: onGameStarted does that once the game is created,
   * so a failed start leaves everyone where they were.
   */
  pickNextGroup(sessionId: string, courtId: string): Promise<string[] | null>;
  /** Full ordered queue for the session screen. */
  getQueue(sessionId: string): Promise<QueueEntryView[]>;
  /** Where one player stands, or null if they aren't waiting. */
  getPosition(sessionId: string, userId: string): Promise<QueueEntryView | null>;
}
