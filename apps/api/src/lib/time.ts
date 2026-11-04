import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz';

const pad = (n: number) => String(n).padStart(2, '0');

/** A wall-clock time at a venue (e.g. "2026-10-29", 18*60) as a UTC Date. */
export function atVenueMinute(date: string, minute: number, tz: string): Date {
  return fromZonedTime(`${date}T${pad(Math.floor(minute / 60))}:${pad(minute % 60)}:00`, tz);
}

/** Start and end (exclusive) of a calendar day at the venue, in UTC. */
export function venueDayBounds(date: string, tz: string) {
  const start = atVenueMinute(date, 0, tz);
  const next = new Date(start.getTime() + 36 * 3600_000); // safely inside the next day
  const end = atVenueMinute(formatInTimeZone(next, tz, 'yyyy-MM-dd'), 0, tz);
  return { start, end };
}

/** Local weekday, minute-of-day and date string for a UTC instant at the venue. */
export function venueLocal(at: Date, tz: string) {
  const z = toZonedTime(at, tz);
  return { dow: z.getDay(), minute: z.getHours() * 60 + z.getMinutes(), date: formatInTimeZone(at, tz, 'yyyy-MM-dd') };
}

export const venueToday = (tz: string) => formatInTimeZone(new Date(), tz, 'yyyy-MM-dd');

export const overlaps = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) => aStart < bEnd && bStart < aEnd;

export const addMinutes = (d: Date, m: number) => new Date(d.getTime() + m * 60_000);
