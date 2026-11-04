import { describe, expect, it } from 'vitest';
import { findSlotRun } from './slots';
import type { Availability } from '@/types/api';

const slot = (courtId: string, h: number, status: Availability['slots'][number]['status'] = 'OPEN') => ({
  courtId,
  startsAt: `2026-11-04T${String(h).padStart(2, '0')}:00:00.000Z`,
  endsAt: `2026-11-04T${String(h + 1).padStart(2, '0')}:00:00.000Z`,
  status,
  priceCents: 40000,
});

const slots = [slot('c1', 9), slot('c1', 10), slot('c1', 11, 'BOOKED'), slot('c2', 9)];

describe('findSlotRun', () => {
  it('returns the slots a booking covers', () => {
    expect(findSlotRun(slots, 'c1', slots[0]!.startsAt, 2)?.length).toBe(2);
  });

  it('refuses a 2-hour booking running into a booked hour', () => {
    expect(findSlotRun(slots, 'c1', slots[1]!.startsAt, 2)).toBeNull();
  });

  it('refuses a 2-hour booking past closing', () => {
    expect(findSlotRun(slots, 'c2', slots[3]!.startsAt, 2)).toBeNull();
  });
});
