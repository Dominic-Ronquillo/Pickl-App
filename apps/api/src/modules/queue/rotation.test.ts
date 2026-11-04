import { describe, expect, it } from 'vitest';
import {
  buildGroup,
  decideAfterGame,
  DEFAULT_ROTATION,
  estimateWaitMinutes,
  estimateWaits,
  previewGroups,
  rotationMode,
} from './rotation.js';

const cfg = DEFAULT_ROTATION; // 4-off at 8 waiting, 2 games max on court, 15-minute games

const game = (scoreA: number, scoreB: number, streaks = [1, 1, 1, 1]) => ({
  scoreA,
  scoreB,
  players: [
    { userId: 'a1', team: 'A' as const, streak: streaks[0] },
    { userId: 'a2', team: 'A' as const, streak: streaks[1] },
    { userId: 'b1', team: 'B' as const, streak: streaks[2] },
    { userId: 'b2', team: 'B' as const, streak: streaks[3] },
  ],
});

describe('rotationMode', () => {
  it('plays 2 on / 2 off below the threshold and 4 on / 4 off at it', () => {
    expect(rotationMode(7, cfg)).toBe('TWO_OFF');
    expect(rotationMode(8, cfg)).toBe('FOUR_OFF');
  });
});

describe('decideAfterGame', () => {
  it('keeps winners on and sends losers to the back in 2 on / 2 off', () => {
    const d = decideAfterGame(game(11, 7, [0, 0, 0, 0]), 3, cfg);
    expect(d.stay).toEqual([
      { userId: 'a1', streak: 1 },
      { userId: 'a2', streak: 1 },
    ]);
    expect(d.off).toEqual(['b1', 'b2']);
  });

  it('sends winners off once they reach the consecutive-game cap', () => {
    const d = decideAfterGame(game(9, 11, [2, 2, 2, 2]), 3, cfg);
    expect(d.stay).toEqual([]);
    expect(d.off).toEqual(['a1', 'a2', 'b1', 'b2']); // losers first, then winners who timed out
  });

  it('sends everyone off when the queue is long', () => {
    const d = decideAfterGame(game(11, 3), 8, cfg);
    expect(d.stay).toEqual([]);
    expect(d.off).toEqual(['b1', 'b2', 'a1', 'a2']);
  });

  it('sends everyone off on a tie (no winner recorded)', () => {
    expect(decideAfterGame(game(0, 0), 2, cfg).stay).toEqual([]);
  });

  it('counts the game just played toward the streak', () => {
    // Fresh players (streak 0 going in) have played 1 game when it ends
    const d = decideAfterGame(game(11, 5, [0, 0, 0, 0]), 2, cfg);
    expect(d.stay.map((s) => s.streak)).toEqual([1, 1]);
  });
});

describe('buildGroup', () => {
  it('splits staying winners across both teams', () => {
    expect(buildGroup(['w1', 'w2'], ['q1', 'q2', 'q3'])).toEqual(['w1', 'q1', 'w2', 'q2']);
  });

  it('fills a court with one staying player', () => {
    expect(buildGroup(['w1'], ['q1', 'q2', 'q3'])).toEqual(['w1', 'q1', 'q2', 'q3']);
  });

  it('takes the next four from an empty court', () => {
    expect(buildGroup([], ['q1', 'q2', 'q3', 'q4', 'q5'])).toEqual(['q1', 'q2', 'q3', 'q4']);
  });

  it('returns null when there are not enough players', () => {
    expect(buildGroup(['w1', 'w2'], ['q1'])).toBeNull();
    expect(buildGroup([], ['q1', 'q2', 'q3'])).toBeNull();
  });
});

describe('previewGroups', () => {
  it('serves courts with staying winners first, then full groups of four', () => {
    const groups = previewGroups([['w1', 'w2']], ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7'], 3);
    expect(groups).toEqual([
      ['w1', 'q1', 'w2', 'q2'],
      ['q3', 'q4', 'q5', 'q6'],
    ]);
  });
});

describe('estimateWaitMinutes', () => {
  it('is zero for players who will be in the next rotation', () => {
    expect(estimateWaitMinutes(2, 2, 4, cfg)).toBe(0); // 2 courts × 2 spots each
  });

  it('grows by one game length per rotation', () => {
    expect(estimateWaitMinutes(5, 2, 6, cfg)).toBe(15);
    expect(estimateWaitMinutes(9, 2, 10, cfg)).toBe(15); // 4-off: 8 spots per rotation
  });

  it('is null without courts', () => {
    expect(estimateWaitMinutes(1, 0, 1, cfg)).toBeNull();
  });
});

describe('estimateWaits', () => {
  it('matches "Up next": players already in a next group wait 0, the rest start after them', () => {
    // 2 courts; one court has a winner staying, so the next groups take 3 + ... players
    const waiting = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'];
    const upNext = ['w1', 'q1', 'q2', 'q3', 'w2', 'q4', 'w3', 'q5'];
    expect(estimateWaits(waiting, upNext, 2, cfg)).toEqual([0, 0, 0, 0, 0, 15]);
  });

  it('is null without courts', () => {
    expect(estimateWaits(['q1'], [], 0, cfg)).toEqual([null]);
  });
});
