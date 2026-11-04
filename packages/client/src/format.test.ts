import { describe, expect, it } from 'vitest';
import { initials, peso, timeOfDay, upcomingDates, venueDate } from './format';

describe('format', () => {
  it('formats centavos as pesos', () => {
    expect(peso(40000)).toBe('₱400');
    expect(peso(123456)).toBe('₱1,234.56');
  });

  it('shows venue-local times, dropping :00', () => {
    expect(timeOfDay('2026-11-04T09:00:00Z')).toBe('5 PM'); // UTC+8
    expect(timeOfDay('2026-11-04T01:30:00Z')).toBe('9:30 AM');
  });

  it('computes the venue date, not the browser date', () => {
    // 20:00 UTC on Nov 3 is already Nov 4 in Manila
    expect(venueDate(new Date('2026-11-03T20:00:00Z'))).toBe('2026-11-04');
  });

  it('builds a date strip starting today', () => {
    const days = upcomingDates(3, 'Asia/Manila', new Date('2026-11-04T02:00:00Z'));
    expect(days.map((d) => d.value)).toEqual(['2026-11-04', '2026-11-05', '2026-11-06']);
    expect(days[0]!.weekday).toBe('Today');
  });

  it('makes initials', () => {
    expect(initials('Andrea  Cruz')).toBe('AC');
  });
});
