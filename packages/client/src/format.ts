/** Display helpers. Money arrives in centavos; times arrive as UTC ISO strings. */

export const DEFAULT_TZ = 'Asia/Manila';

export function peso(cents: number) {
  const pesos = cents / 100;
  return `₱${pesos.toLocaleString('en-PH', { minimumFractionDigits: pesos % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
}

const fmt = (opts: Intl.DateTimeFormatOptions, tz: string) =>
  new Intl.DateTimeFormat('en-PH', { ...opts, timeZone: tz });

/** "5 PM", or "5:30 PM" when not on the hour. */
export function timeOfDay(iso: string | Date, tz = DEFAULT_TZ) {
  const d = new Date(iso);
  const parts = fmt({ hour: 'numeric', minute: '2-digit', hour12: true }, tz).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const minute = get('minute');
  return `${get('hour')}${minute === '00' ? '' : `:${minute}`} ${get('dayPeriod').toUpperCase()}`;
}

/** "Wed, Nov 4" */
export const dayLabel = (iso: string | Date, tz = DEFAULT_TZ) =>
  fmt({ weekday: 'short', month: 'short', day: 'numeric' }, tz).format(new Date(iso));

/** YYYY-MM-DD for a date as seen at the venue. */
export const venueDate = (d: Date, tz = DEFAULT_TZ) =>
  new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: tz }).format(d);

/** Next `days` venue dates starting today, for the date strip. */
export function upcomingDates(days: number, tz = DEFAULT_TZ, from = new Date()) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(from.getTime() + i * 86_400_000);
    return {
      value: venueDate(d, tz),
      weekday: i === 0 ? 'Today' : fmt({ weekday: 'short' }, tz).format(d),
      day: fmt({ day: 'numeric' }, tz).format(d),
    };
  });
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');

export const SKILL_LABEL = {
  ALL: 'All levels',
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
};
