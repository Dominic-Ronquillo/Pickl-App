import { describe, expect, it } from 'vitest';
import { atVenueMinute, overlaps, venueDayBounds, venueLocal } from './time.js';

const TZ = 'Asia/Manila'; // UTC+8, no daylight saving

describe('venue time helpers', () => {
  it('converts a venue wall-clock time to UTC', () => {
    expect(atVenueMinute('2026-11-04', 17 * 60, TZ).toISOString()).toBe('2026-11-04T09:00:00.000Z');
  });

  it('computes a venue day in UTC', () => {
    const { start, end } = venueDayBounds('2026-11-04', TZ);
    expect(start.toISOString()).toBe('2026-11-03T16:00:00.000Z');
    expect(end.toISOString()).toBe('2026-11-04T16:00:00.000Z');
  });

  it('reads local weekday and minute', () => {
    // 2026-11-04 is a Wednesday
    expect(venueLocal(new Date('2026-11-04T09:30:00Z'), TZ)).toEqual({
      dow: 3,
      minute: 17 * 60 + 30,
      date: '2026-11-04',
    });
  });

  it('treats ranges that only touch as not overlapping', () => {
    const t = (h: number) => new Date(Date.UTC(2026, 10, 4, h));
    expect(overlaps(t(9), t(10), t(10), t(11))).toBe(false);
    expect(overlaps(t(9), t(11), t(10), t(12))).toBe(true);
  });
});
