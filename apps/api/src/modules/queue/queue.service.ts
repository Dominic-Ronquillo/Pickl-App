import { HttpError } from '../../lib/http.js';
import type { QueueStrategy } from './queue.types.js';

export class QueueNotReadyError extends HttpError {
  constructor() {
    super(501, 'The open play queue isn’t set up yet', 'QUEUE_NOT_READY');
  }
}

/**
 * Placeholder until the queue rules arrive. Lifecycle hooks are no-ops so check-in,
 * games and lineups already work end to end; reads return empty, and the
 * queue endpoints answer 501 QUEUE_NOT_READY.
 */
const pendingQueue: QueueStrategy = {
  async onCheckIn() {},
  async onLeave() {},
  async onGameEnded() {},
  async peekNextGroups() {
    return [];
  },
  async takeNextGroup() {
    return null;
  },
  async getQueue() {
    throw new QueueNotReadyError();
  },
  async getPosition() {
    throw new QueueNotReadyError();
  },
};

export const queue: QueueStrategy = pendingQueue;
