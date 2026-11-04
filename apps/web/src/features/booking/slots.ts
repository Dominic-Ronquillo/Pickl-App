import type { Availability } from '@/types/api';

type Slot = Availability['slots'][number];

/**
 * The consecutive one-hour slots a booking would cover on one court, or null if any of them
 * isn't open. The API returns hourly slots; a 2-hour booking needs two open slots back to back.
 */
export function findSlotRun(slots: Slot[], courtId: string, startsAt: string, hours: number): Slot[] | null {
  const run: Slot[] = [];
  let at = startsAt;
  for (let i = 0; i < hours; i++) {
    const slot = slots.find((s) => s.courtId === courtId && s.startsAt === at);
    if (!slot || slot.status !== 'OPEN') return null;
    run.push(slot);
    at = slot.endsAt;
  }
  return run;
}
