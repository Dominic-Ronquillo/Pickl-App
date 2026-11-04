import type { PricingRule } from '@prisma/client';
import { HttpError } from './http.js';
import { venueLocal } from './time.js';

export function pickRule(rules: PricingRule[], dow: number, minute: number): PricingRule | undefined {
  return rules
    .filter((r) => (r.dayOfWeek === null || r.dayOfWeek === dow) && minute >= r.startMinute && minute < r.endMinute)
    .sort((a, b) => Number(b.dayOfWeek !== null) - Number(a.dayOfWeek !== null) || b.priority - a.priority)[0];
}

/** Price a court for [startsAt, endsAt), in 30-minute steps so a booking can cross a peak boundary. */
export function priceRange(rules: PricingRule[], tz: string, startsAt: Date, endsAt: Date): number {
  const step = 30 * 60_000;
  let total = 0;
  for (let t = startsAt.getTime(); t < endsAt.getTime(); t += step) {
    const { dow, minute } = venueLocal(new Date(t), tz);
    const rule = pickRule(rules, dow, minute);
    if (!rule) throw new HttpError(422, 'This venue has no price set for that time', 'NO_PRICE');
    total += rule.centsPerHour / 2;
  }
  return Math.round(total);
}
