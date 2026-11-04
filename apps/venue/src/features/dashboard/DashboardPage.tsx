import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@courtside/client/api';
import { peso, timeOfDay } from '@courtside/client/format';
import { useAuth } from '@courtside/client/auth';
import { Badge, Card, Chips, ErrorState, Loading, PageHeader, SectionTitle } from '@courtside/ui';
import type { Dashboard } from '@courtside/client/types';

const COURT_STATUS = {
  FREE: { label: 'Free', tone: 'neutral' },
  BOOKED: { label: 'Booked', tone: 'court' },
  OPEN_PLAY: { label: 'Open play', tone: 'kitchen' },
  BLOCKED: { label: 'Maintenance', tone: 'warn' },
} as const;

/** First screen of the venue app. Schedule, bookings and open play management come next (see docs/roadmap.md). */
export function DashboardPage() {
  const { venues } = useAuth();
  const [venueId, setVenueId] = useState(venues[0]?.id ?? '');
  const venue = venues.find((v) => v.id === venueId);
  const dashboard = useQuery({
    queryKey: ['business', venueId, 'dashboard'],
    queryFn: () => api<Dashboard>(`/business/venues/${venueId}/dashboard`),
    enabled: !!venueId,
    refetchInterval: 60_000,
  });
  const d = dashboard.data;
  const maxHour = Math.max(1, ...(d?.hourlyRevenue.map((h) => h.cents) ?? []));

  return (
    <>
      <PageHeader title={venue?.name ?? 'Dashboard'} subtitle="Today at a glance" />
      {venues.length > 1 && (
        <div className="mt-3">
          <Chips
            label="Venue"
            value={venueId}
            onChange={setVenueId}
            options={venues.map((v) => ({ value: v.id, label: v.name }))}
          />
        </div>
      )}

      {dashboard.isPending ? (
        <Loading />
      ) : dashboard.isError ? (
        <div className="mt-4">
          <ErrorState error={dashboard.error} onRetry={() => dashboard.refetch()} />
        </div>
      ) : (
        d && (
          <>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                [peso(d.revenueCents), 'Revenue collected'],
                [`${d.courtUsePercent}%`, 'Court use'],
                [String(d.bookingCount), 'Bookings'],
                [String(d.checkInCount), 'Open play check-ins'],
              ].map(([v, l]) => (
                <Card key={l}>
                  <b className="display block text-3xl">{v}</b>
                  <span className="text-xs text-ink-2">{l}</span>
                </Card>
              ))}
            </div>

            <SectionTitle>Revenue by hour</SectionTitle>
            <Card>
              {d.revenueCents === 0 && <p className="mb-2 text-sm text-ink-2">No payments recorded yet today.</p>}
              <div className="flex h-36 items-end gap-1" role="img" aria-label="Revenue by hour today">
                {d.hourlyRevenue.map((h) => (
                  <div key={h.hour} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t bg-court"
                      style={{
                        height: `${(h.cents / maxHour) * 100}%`,
                        minHeight: h.cents ? 4 : 1,
                        opacity: h.cents ? 1 : 0.25,
                      }}
                      title={`${h.hour}:00 · ${peso(h.cents)}`}
                    />
                    <span className="text-[10px] text-ink-3">{h.hour % 3 === 0 ? h.hour : ''}</span>
                  </div>
                ))}
              </div>
            </Card>

            <SectionTitle>Courts right now</SectionTitle>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {d.courtsNow.map((c) => {
                const st = COURT_STATUS[c.status];
                return (
                  <Card key={c.courtId}>
                    <div className="flex items-center justify-between">
                      <b className="[font-stretch:80%]">Court {c.number}</b>
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </div>
                    {c.booking && (
                      <p className="mt-2 text-sm text-ink-2">
                        {c.booking.name ?? 'Walk-in'} · until {timeOfDay(c.booking.endsAt)}
                      </p>
                    )}
                  </Card>
                );
              })}
            </div>
          </>
        )
      )}
    </>
  );
}
