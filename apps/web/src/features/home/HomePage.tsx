import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { dayLabel, peso, timeOfDay } from '@/lib/format';
import { useAuth } from '@/features/auth/auth-context';
import { Badge, Card, Empty, ErrorState, Loading, PageHeader, SectionTitle } from '@/components/ui';
import type { Booking, RecentGame, Stats } from '@/types/api';

interface MyOpenPlay {
  id: string;
  status: 'JOINED' | 'CHECKED_IN';
  session: { id: string; title: string | null; startsAt: string; status: string; venue: { name: string } };
}

const first = (p: { name: string }) => p.name.split(' ')[0];

export function HomePage() {
  const { user } = useAuth();
  const bookings = useQuery({ queryKey: ['me', 'bookings'], queryFn: () => api<Booking[]>('/me/bookings') });
  const stats = useQuery({ queryKey: ['me', 'stats'], queryFn: () => api<Stats>('/me/stats') });
  const openPlay = useQuery({ queryKey: ['me', 'open-play'], queryFn: () => api<MyOpenPlay[]>('/me/open-play') });
  const games = useQuery({ queryKey: ['me', 'games'], queryFn: () => api<RecentGame[]>('/me/games') });
  const next = bookings.data?.[0];

  return (
    <>
      <PageHeader
        title={`Hi, ${user?.name.split(' ')[0]}`}
        subtitle={`Rating ${Number(user?.rating ?? 0).toFixed(2)}`}
      />

      <div className="mt-4 grid gap-4 md:grid-cols-[1.4fr_1fr]">
        {bookings.isPending ? (
          <Loading />
        ) : bookings.isError ? (
          <ErrorState error={bookings.error} onRetry={() => bookings.refetch()} />
        ) : next ? (
          <section
            aria-label="Next booking"
            className="relative overflow-hidden rounded-[22px] bg-court p-5 text-white"
          >
            <div aria-hidden className="absolute top-4 right-[-40px] bottom-4 w-44 border-2 border-r-0 border-white/20">
              <div className="absolute inset-y-0 left-6 w-12 border-l-2 border-white/20 bg-kitchen/55" />
            </div>
            <div className="relative">
              <p className="text-sm text-white/80">
                Next up · {next.venue.name}, Court {next.court.number}
              </p>
              <p className="display mt-1 text-[40px]">{timeOfDay(next.startsAt)}</p>
              <p className="text-white/80">
                {dayLabel(next.startsAt)} · until {timeOfDay(next.endsAt)} · {peso(next.totalCents)}
              </p>
            </div>
          </section>
        ) : (
          <Empty>
            No court booked yet.{' '}
            <Link to="/book" className="font-bold text-court-text">
              Book a court
            </Link>
          </Empty>
        )}

        <Card className="grid grid-cols-3 divide-x divide-line p-0">
          {[
            ['Games', stats.data?.gamesTotal],
            ['This month', stats.data?.gamesThisMonth],
            ['Win rate', stats.data?.winRate == null ? '–' : `${stats.data.winRate}%`],
          ].map(([label, value]) => (
            <div key={label} className="p-4">
              <b className="display block text-3xl">{stats.isPending ? '·' : (value ?? 0)}</b>
              <span className="text-xs text-ink-2">{label}</span>
            </div>
          ))}
        </Card>
      </div>

      <SectionTitle
        action={
          <Link to="/open-play" className="text-sm font-semibold text-court-text">
            Find a session
          </Link>
        }
      >
        Your open play
      </SectionTitle>
      {openPlay.isPending ? (
        <Loading />
      ) : openPlay.isError ? (
        <ErrorState error={openPlay.error} />
      ) : openPlay.data.length === 0 ? (
        <Empty>You haven’t joined a session yet.</Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {openPlay.data.map((r) => (
            <Link key={r.id} to={`/open-play/${r.session.id}`}>
              <Card className="flex items-center justify-between gap-3 hover:border-court">
                <div>
                  <p className="font-bold">{r.session.title ?? 'Open play'}</p>
                  <p className="text-sm text-ink-2">
                    {r.session.venue.name} · {dayLabel(r.session.startsAt)}, {timeOfDay(r.session.startsAt)}
                  </p>
                </div>
                {r.session.status === 'LIVE' ? (
                  <Badge tone="kitchen">Live</Badge>
                ) : (
                  <Badge>{r.status === 'CHECKED_IN' ? 'Checked in' : 'Joined'}</Badge>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}

      <SectionTitle>Recent games</SectionTitle>
      {games.isPending ? (
        <Loading />
      ) : games.isError ? (
        <ErrorState error={games.error} />
      ) : games.data.length === 0 ? (
        <Empty>Your results show up here after your first open play game.</Empty>
      ) : (
        <ul className="divide-y divide-line rounded-[18px] border border-line bg-card px-4">
          {games.data.slice(0, 5).map((g) => (
            <li key={g.id} className="flex items-center gap-3 py-3">
              <span
                className={`min-w-8 rounded-lg px-2 py-1 text-center text-xs font-extrabold ${g.won ? 'bg-kitchen text-white' : 'bg-line text-ink-2'}`}
              >
                {g.won ? 'W' : 'L'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {['You', ...g.partners.map(first)].join(' & ')} vs {g.opponents.map(first).join(' & ')}
                </p>
                <p className="text-sm text-ink-2">{dayLabel(g.endedAt)}</p>
              </div>
              <b className="display text-xl">{g.score}</b>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
