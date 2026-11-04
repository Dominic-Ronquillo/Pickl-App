import { useMemo, useState } from 'react';
import { cx } from '@courtside/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@courtside/client/api';
import { dayLabel, peso, timeOfDay, upcomingDates } from '@courtside/client/format';
import {
  Badge,
  Button,
  Card,
  Chips,
  Empty,
  ErrorState,
  Loading,
  PageHeader,
  SectionTitle,
  Segmented,
} from '@courtside/ui';
import type { Availability, Booking, SlotStatus, Venue } from '@courtside/client/types';
import { findSlotRun } from './slots';

type Duration = '60' | '120';

const STATUS_STYLE: Record<SlotStatus, string> = {
  OPEN: 'border-line bg-card hover:border-court',
  MINE: 'border-kitchen bg-kitchen text-white',
  BOOKED: 'border-transparent bg-court/80 text-white',
  OPEN_PLAY: 'border-transparent bg-kitchen/25 text-ink-2',
  BLOCKED: 'border-transparent bg-warn/25 text-ink-2',
  PAST: 'border-transparent bg-line/60 text-ink-3',
};
const STATUS_LABEL: Record<SlotStatus, string> = {
  OPEN: '',
  MINE: 'Yours',
  BOOKED: 'Booked',
  OPEN_PLAY: 'Open play',
  BLOCKED: 'Closed',
  PAST: '',
};

export function BookPage() {
  const queryClient = useQueryClient();
  const dates = useMemo(() => upcomingDates(7), []);
  const [pickedVenue, setPickedVenue] = useState<string>('');
  const [date, setDateState] = useState(dates[0]!.value);
  const [duration, setDurationState] = useState<Duration>('60');
  const [selected, setSelected] = useState<{ courtId: string; startsAt: string } | null>(null);

  const venues = useQuery({ queryKey: ['venues'], queryFn: () => api<Venue[]>('/venues') });
  const venueId = pickedVenue || venues.data?.[0]?.id || '';

  // Changing what's shown clears the selected slot.
  const setVenueId = (v: string) => (setPickedVenue(v), setSelected(null));
  const setDate = (d: string) => (setDateState(d), setSelected(null));
  const setDuration = (d: Duration) => (setDurationState(d), setSelected(null));

  const availability = useQuery({
    queryKey: ['availability', venueId, date],
    queryFn: () => api<Availability>(`/venues/${venueId}/availability?date=${date}`),
    enabled: !!venueId,
  });
  const myBookings = useQuery({ queryKey: ['me', 'bookings'], queryFn: () => api<Booking[]>('/me/bookings') });

  const grid = useMemo(() => {
    const a = availability.data;
    if (!a) return null;
    const hours = [...new Set(a.slots.map((s) => s.startsAt))].sort();
    const at = new Map(a.slots.map((s) => [`${s.courtId}|${s.startsAt}`, s]));
    return { ...a, hours, at };
  }, [availability.data]);

  const run =
    grid && selected ? findSlotRun(grid.slots, selected.courtId, selected.startsAt, Number(duration) / 60) : null;
  const tz = grid?.venue.timezone;

  const book = useMutation({
    mutationFn: () =>
      api<Booking>('/bookings', { method: 'POST', body: { ...selected, durationMinutes: Number(duration) } }),
    onSuccess: () => {
      setSelected(null);
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
  const cancel = useMutation({
    mutationFn: (id: string) => api(`/bookings/${id}/cancel`, { method: 'POST', body: {} }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });

  return (
    <>
      <PageHeader title="Book a court" subtitle="Prices are per court per hour. Peak pricing starts at 5 PM." />

      {venues.isError ? (
        <ErrorState error={venues.error} onRetry={() => venues.refetch()} />
      ) : (
        <div className="mt-4 space-y-4">
          <Chips
            label="Venue"
            value={venueId}
            onChange={setVenueId}
            options={(venues.data ?? []).map((v) => ({ value: v.id, label: v.name }))}
          />

          <div
            role="group"
            aria-label="Date"
            className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]"
          >
            {dates.map((d) => (
              <button
                key={d.value}
                aria-pressed={d.value === date}
                onClick={() => setDate(d.value)}
                className="w-14 flex-none rounded-2xl border-[1.5px] border-line bg-card py-2 text-center aria-pressed:border-court aria-pressed:bg-court aria-pressed:text-white"
              >
                <small className="block text-[11px] font-semibold opacity-80">{d.weekday}</small>
                <b className="display block text-2xl">{d.day}</b>
              </button>
            ))}
          </div>

          <div className="max-w-xs">
            <Segmented
              label="Duration"
              value={duration}
              onChange={setDuration}
              options={[
                { value: '60', label: '1 hour' },
                { value: '120', label: '2 hours' },
              ]}
            />
          </div>
        </div>
      )}

      <div className="mt-5">
        {availability.isPending && venueId ? (
          <Loading />
        ) : availability.isError ? (
          <ErrorState error={availability.error} onRetry={() => availability.refetch()} />
        ) : grid && grid.hours.length === 0 ? (
          <Empty>This venue has no open hours that day.</Empty>
        ) : grid ? (
          <div className="overflow-x-auto">
            <table
              className="w-full border-separate border-spacing-1 text-sm sm:border-spacing-1.5"
              style={{ minWidth: 48 + grid.courts.length * 72 }}
            >
              <caption className="sr-only">Court availability for {dayLabel(`${date}T12:00:00Z`, tz)}</caption>
              <thead>
                <tr>
                  <th className="w-12" />
                  {grid.courts.map((c) => (
                    <th key={c.id} scope="col" className="pb-1 font-bold [font-stretch:80%]">
                      Court {c.number}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grid.hours.map((h) => (
                  <tr key={h}>
                    <th scope="row" className="pr-1 text-right text-xs font-semibold text-ink-2">
                      {timeOfDay(h, tz)}
                    </th>
                    {grid.courts.map((c) => {
                      const slot = grid.at.get(`${c.id}|${h}`);
                      if (!slot) return <td key={c.id} />;
                      const canStart = !!findSlotRun(grid.slots, c.id, h, Number(duration) / 60);
                      const inSelection = run?.some((s) => s.courtId === c.id && s.startsAt === h);
                      return (
                        <td key={c.id}>
                          <button
                            disabled={!canStart}
                            aria-pressed={inSelection}
                            aria-label={`Court ${c.number} at ${timeOfDay(h, tz)}: ${slot.status === 'OPEN' ? `open, ${peso(slot.priceCents ?? 0)}` : STATUS_LABEL[slot.status] || 'unavailable'}`}
                            onClick={() => setSelected({ courtId: c.id, startsAt: h })}
                            className={cx(
                              'h-12 w-full rounded-xl border-[1.5px] px-1 text-xs font-semibold transition',
                              STATUS_STYLE[slot.status],
                              slot.status === 'OPEN' && !canStart && 'cursor-not-allowed opacity-50',
                              inSelection && '!border-ball !bg-ball !text-ball-ink',
                            )}
                          >
                            {slot.status === 'OPEN' ? peso(slot.priceCents ?? 0) : STATUS_LABEL[slot.status]}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      {run && grid && (
        <Card className="sticky bottom-24 mt-4 flex flex-wrap items-center justify-between gap-3 shadow-lg sm:bottom-6">
          <div>
            <p className="font-bold">
              Court {grid.courts.find((c) => c.id === run[0]!.courtId)?.number} · {timeOfDay(run[0]!.startsAt, tz)}–
              {timeOfDay(run[run.length - 1]!.endsAt, tz)}
            </p>
            <p className="text-sm text-ink-2">
              {grid.venue.name} · {dayLabel(run[0]!.startsAt, tz)} ·{' '}
              {peso(run.reduce((n, s) => n + (s.priceCents ?? 0), 0))}, pay at the venue
            </p>
            {book.isError && <p className="mt-1 text-sm text-danger">{errorMessage(book.error)}</p>}
          </div>
          <Button onClick={() => book.mutate()} loading={book.isPending}>
            Book court
          </Button>
        </Card>
      )}

      <SectionTitle>Your bookings</SectionTitle>
      {myBookings.isPending ? (
        <Loading />
      ) : myBookings.isError ? (
        <ErrorState error={myBookings.error} onRetry={() => myBookings.refetch()} />
      ) : myBookings.data.length === 0 ? (
        <Empty>No upcoming bookings. Pick an open slot above.</Empty>
      ) : (
        <ul className="divide-y divide-line rounded-[18px] border border-line bg-card px-4">
          {myBookings.data.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {b.venue.name} · Court {b.court.number}
                </p>
                <p className="text-sm text-ink-2">
                  {dayLabel(b.startsAt)} · {timeOfDay(b.startsAt)}–{timeOfDay(b.endsAt)} · {peso(b.totalCents)}
                </p>
              </div>
              <Badge tone={b.paymentStatus === 'PAID' ? 'kitchen' : 'ball'}>
                {b.paymentStatus === 'PAID' ? 'Paid' : 'Pay at venue'}
              </Badge>
              <Button
                variant="danger"
                size="sm"
                loading={cancel.isPending && cancel.variables === b.id}
                onClick={() => cancel.mutate(b.id)}
              >
                Cancel
              </Button>
            </li>
          ))}
        </ul>
      )}
      {cancel.isError && <p className="mt-2 text-sm text-danger">{errorMessage(cancel.error)}</p>}
    </>
  );
}
