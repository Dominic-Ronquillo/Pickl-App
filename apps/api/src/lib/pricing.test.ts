import { describe, expect, it } from 'vitest';
import type { PricingRule } from '@prisma/client';
import { pickRule, priceRange } from './pricing.js';

const rule = (r: Partial<PricingRule>): PricingRule => ({
  id: Math.random().toString(36),
  venueId: 'v1',
  dayOfWeek: null,
  startMinute: 0,
  endMinute: 1440,
  centsPerHour: 0,
  priority: 0,
  ...r,
});

const rules = [
  rule({ startMinute: 360, endMinute: 1020, centsPerHour: 40000 }), // ₱400 before 5 PM
  rule({ startMinute: 1020, endMinute: 1320, centsPerHour: 50000 }), // ₱500 from 5 PM
];
const TZ = 'Asia/Manila';

describe('pickRule', () => {
  it('prefers a weekday rule over an every-day rule', () => {
    const saturday = rule({ dayOfWeek: 6, startMinute: 360, endMinute: 1320, centsPerHour: 60000 });
    expect(pickRule([...rules, saturday], 6, 600)?.centsPerHour).toBe(60000);
    expect(pickRule([...rules, saturday], 5, 600)?.centsPerHour).toBe(40000);
  });

  it('breaks ties on priority', () => {
    const promo = rule({ startMinute: 360, endMinute: 1020, centsPerHour: 30000, priority: 1 });
    expect(pickRule([...rules, promo], 2, 600)?.centsPerHour).toBe(30000);
  });

  it('treats endMinute as exclusive', () => {
    expect(pickRule(rules, 2, 1019)?.centsPerHour).toBe(40000);
    expect(pickRule(rules, 2, 1020)?.centsPerHour).toBe(50000);
  });
});

describe('priceRange', () => {
  it('prices one off-peak hour', () => {
    // 10:00–11:00 Manila time = 02:00–03:00 UTC
    expect(priceRange(rules, TZ, new Date('2026-11-04T02:00:00Z'), new Date('2026-11-04T03:00:00Z'))).toBe(40000);
  });

  it('splits a booking that crosses into peak pricing', () => {
    // 16:00–18:00 Manila: one hour at ₱400, one at ₱500
    expect(priceRange(rules, TZ, new Date('2026-11-04T08:00:00Z'), new Date('2026-11-04T10:00:00Z'))).toBe(90000);
  });

  it('refuses a time with no price', () => {
    // 23:00 Manila is after closing
    expect(() => priceRange(rules, TZ, new Date('2026-11-04T15:00:00Z'), new Date('2026-11-04T16:00:00Z'))).toThrow(
      /no price/,
    );
  });
});
