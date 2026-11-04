import { Link, useParams } from 'react-router';
import {
  cx,
  CourtDiagram,
  Avatar,
  Badge,
  Button,
  Card,
  Empty,
  ErrorState,
  Loading,
  PageHeader,
  SectionTitle,
} from '@courtside/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError, errorMessage } from '@courtside/client/api';
import { dayLabel, peso, SKILL_LABEL, timeOfDay } from '@courtside/client/format';
import { useSessionLive } from '@courtside/client/realtime';
import { useAuth } from '@courtside/client/auth';
import type { Lineups, QueueEntry, SessionDetail } from '@courtside/client/types';

const names = (ps: { name: string }[]) => ps.map((p) => p.name.split(' ')[0]).join(' & ');

export function SessionPage() {
  const { sessionId = '' } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const keys = {
    detail: ['session', sessionId],
    lineups: ['session', sessionId, 'lineups'],
    queue: ['session', sessionId, 'queue'],
  };
  useSessionLive(sessionId, Object.values(keys));

  const session = useQuery({
    queryKey: keys.detail,
    queryFn: () => api<SessionDetail>(`/open-play/sessions/${sessionId}`),
  });
  const live = session.data?.status === 'LIVE';
  const lineups = useQuery({
    queryKey: keys.lineups,
    queryFn: () => api<Lineups>(`/open-play/sessions/${sessionId}/lineups`),
    enabled: live,
  });
  const queue = useQuery({
    queryKey: keys.queue,
    queryFn: () => api<QueueEntry[]>(`/open-play/sessions/${sessionId}/queue`),
    enabled: live,
  });

  const refresh = () =>
    queryClient
      .invalidateQueries({ queryKey: ['session', sessionId] })
      .then(() => queryClient.invalidateQueries({ queryKey: ['me'] }));
  const join = useMutation({
    mutationFn: () => api(`/open-play/sessions/${sessionId}/join`, { method: 'POST' }),
    onSuccess: refresh,
  });
  const leave = useMutation({
    mutationFn: () => api(`/open-play/sessions/${sessionId}/leave`, { method: 'POST' }),
    onSuccess: refresh,
  });

  if (session.isPending) return <Loading />;
  if (session.isError)
    return session.error instanceof ApiError && session.error.status === 404 ? (
      <Empty>
        That session doesn’t exist anymore.{' '}
        <Link to="/open-play" className="font-bold text-court-text">
          See all sessions
        </Link>
      </Empty>
    ) : (
      <ErrorState error={session.error} onRetry={() => session.refetch()} />
    );

  const s = session.data;
  const me = queue.data?.find((e) => e.userId === user?.id);
  const onCourt = lineups.data?.courts.find(
    (c) => c.game && [...c.game.teamA, ...c.game.teamB].some((p) => p.id === user?.id),
  );
  const actionError = join.error ?? leave.error;

  return (
    <>
      <Link to="/open-play" className="text-sm font-semibold text-court-text">
        ← Open play
      </Link>
      <PageHeader
        title={s.title ?? 'Open play'}
        subtitle={`${s.venue.name} · ${dayLabel(s.startsAt)}, ${timeOfDay(s.startsAt)}–${timeOfDay(s.endsAt)}`}
      >
        {live ? <Badge tone="kitchen">Live now</Badge> : <Badge>{SKILL_LABEL[s.skillLevel]}</Badge>}
      </PageHeader>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          [peso(s.feeCents), 'Fee'],
          [`${s.playerCount}/${s.capacity}`, 'Players'],
          [String(s.courts.length), 'Courts'],
        ].map(([v, l]) => (
          <Card key={l} className="px-3 py-2.5">
            <b className="display block text-2xl">{v}</b>
            <span className="text-xs text-ink-2">{l}</span>
          </Card>
        ))}
      </div>

      <Card className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-2">
          {s.myStatus === 'CHECKED_IN'
            ? 'You’re checked in.'
            : s.myStatus === 'JOINED'
              ? 'You’re in. Check in at the front desk to join the queue.'
              : s.spotsLeft
                ? `${s.spotsLeft} spots left.`
                : 'This session is full.'}
          {actionError && <span className="block text-danger">{errorMessage(actionError)}</span>}
        </p>
        {s.myStatus ? (
          <Button variant="outline" size="sm" loading={leave.isPending} onClick={() => leave.mutate()}>
            Leave session
          </Button>
        ) : (
          <Button size="sm" disabled={!s.spotsLeft} loading={join.isPending} onClick={() => join.mutate()}>
            Join · {peso(s.feeCents)}
          </Button>
        )}
      </Card>

      {live && (
        <>
          <SectionTitle>Courts</SectionTitle>
          {lineups.isPending ? (
            <Loading />
          ) : lineups.isError ? (
            <ErrorState error={lineups.error} />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {lineups.data.courts.map((c) => (
                <Card key={c.id} className={cx('p-3', onCourt?.id === c.id && 'border-ball ring-2 ring-ball')}>
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold [font-stretch:80%]">Court {c.number}</h3>
                      <p className="text-xs text-ink-2">{c.game ? `Game ${c.game.sequence}` : 'Waiting for players'}</p>
                    </div>
                    {c.game && (
                      <b className="display text-3xl" aria-label={`Score ${c.game.scoreA} to ${c.game.scoreB}`}>
                        {c.game.scoreA}–{c.game.scoreB}
                      </b>
                    )}
                  </div>
                  <CourtDiagram label={`Court ${c.number}`} teamA={c.game?.teamA} teamB={c.game?.teamB} />
                  {c.game && (
                    <p className="mt-2 flex justify-between text-sm">
                      <span>{names(c.game.teamA)}</span>
                      <span className="text-ink-3">vs</span>
                      <span>{names(c.game.teamB)}</span>
                    </p>
                  )}
                </Card>
              ))}
            </div>
          )}

          {lineups.data && lineups.data.upNext.length > 0 && (
            <>
              <SectionTitle>Up next</SectionTitle>
              <ol className="divide-y divide-line rounded-[18px] border border-line bg-card px-4">
                {lineups.data.upNext.map((g, i) => (
                  <li key={i} className="flex items-center gap-3 py-3">
                    <span className="display w-6 text-2xl text-ink-3">{i + 1}</span>
                    <span className="font-semibold">{names(g.teamA)}</span>
                    <span className="text-ink-3">vs</span>
                    <span className="font-semibold">{names(g.teamB)}</span>
                  </li>
                ))}
              </ol>
            </>
          )}

          <SectionTitle>{me ? `You’re #${me.position} in line` : 'Queue'}</SectionTitle>
          {onCourt && (
            <p className="mb-3 rounded-2xl bg-ball px-4 py-3 font-semibold text-ball-ink">
              You’re on Court {onCourt.number}. Have a good game!
            </p>
          )}
          {queue.isPending ? (
            <Loading />
          ) : queue.isError ? (
            <ErrorState error={queue.error} />
          ) : queue.data.length === 0 ? (
            <Empty>Nobody is waiting. Everyone checked in is on a court.</Empty>
          ) : (
            <ol className="divide-y divide-line rounded-[18px] border border-line bg-card px-4">
              {queue.data.map((e) => (
                <li key={e.userId} className={cx('flex items-center gap-3 py-3', e.userId === user?.id && 'font-bold')}>
                  <span className={cx('display w-6 text-2xl', e.userId === user?.id ? 'text-kitchen' : 'text-ink-3')}>
                    {e.position}
                  </span>
                  <Avatar name={e.name} />
                  <span className="flex-1">{e.userId === user?.id ? 'You' : e.name}</span>
                  <span className="text-sm text-ink-2">
                    {e.estimatedWaitMinutes ? `~${e.estimatedWaitMinutes} min` : 'Next rotation'}
                  </span>
                </li>
              ))}
            </ol>
          )}
          <p className="mt-2 text-xs text-ink-3">
            Winners stay on and split up for up to 2 games; with 8 or more waiting, all four rotate off.{' '}
            <Link to="/open-play/rules" className="underline">
              How the queue works
            </Link>
          </p>
        </>
      )}

      <SectionTitle>Players ({s.players.length})</SectionTitle>
      <div className="flex flex-wrap gap-2">
        {s.players.map((p) => (
          <span
            key={p.id}
            className="flex items-center gap-2 rounded-full border border-line bg-card py-1 pr-3 pl-1 text-sm"
          >
            <Avatar name={p.name} size={26} />
            {p.name}
            {p.checkedIn && <span className="size-2 rounded-full bg-kitchen" title="Checked in" />}
          </span>
        ))}
      </div>
    </>
  );
}
