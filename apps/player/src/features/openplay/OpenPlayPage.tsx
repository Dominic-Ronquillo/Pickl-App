import { useState } from 'react';
import { cx, Badge, Chips, Empty, ErrorState, Loading, PageHeader } from '@courtside/ui';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '@courtside/client/api';
import { dayLabel, peso, SKILL_LABEL, timeOfDay } from '@courtside/client/format';
import type { SessionSummary, SkillLevel } from '@courtside/client/types';

const LEVELS: { value: SkillLevel | 'ANY'; label: string }[] = [
  { value: 'ANY', label: 'Any level' },
  ...(Object.entries(SKILL_LABEL) as [SkillLevel, string][]).map(([value, label]) => ({ value, label })),
];

export function OpenPlayPage() {
  const [level, setLevel] = useState<SkillLevel | 'ANY'>('ANY');
  const sessions = useQuery({
    queryKey: ['open-play', level],
    queryFn: () => {
      // Include sessions that started in the last few hours so live ones show up.
      const from = new Date(Date.now() - 4 * 3600_000).toISOString();
      return api<SessionSummary[]>(`/open-play/sessions?from=${from}${level === 'ANY' ? '' : `&level=${level}`}`);
    },
  });

  const byDay = new Map<string, SessionSummary[]>();
  for (const s of sessions.data ?? []) byDay.set(dayLabel(s.startsAt), [...(byDay.get(dayLabel(s.startsAt)) ?? []), s]);

  return (
    <>
      <PageHeader title="Open play" subtitle="Drop in, get in the queue, and play with people at your level." />
      <div className="mt-4">
        <Chips label="Skill level" value={level} onChange={setLevel} options={LEVELS} />
      </div>

      {sessions.isPending ? (
        <Loading />
      ) : sessions.isError ? (
        <div className="mt-4">
          <ErrorState error={sessions.error} onRetry={() => sessions.refetch()} />
        </div>
      ) : byDay.size === 0 ? (
        <div className="mt-6">
          <Empty>No sessions this week for that level.</Empty>
        </div>
      ) : (
        [...byDay].map(([day, list]) => (
          <section key={day} aria-label={day}>
            <h2 className="mt-6 mb-2 text-[17px] font-bold text-ink-2 [font-stretch:80%]">{day}</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {list.map((s) => {
                const fill = s.capacity ? (s.capacity - s.spotsLeft) / s.capacity : 0;
                return (
                  <Link
                    key={s.id}
                    to={`/open-play/${s.id}`}
                    className="grid grid-cols-[58px_1fr_auto] items-center gap-3 rounded-[18px] border border-line bg-card p-4 hover:border-court"
                  >
                    <div>
                      <b className="display block text-[26px]">{timeOfDay(s.startsAt).replace(/ (AM|PM)$/, '')}</b>
                      <span className="text-xs font-semibold text-ink-2">{timeOfDay(s.startsAt).slice(-2)}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-bold">{s.title ?? 'Open play'}</p>
                      <p className="truncate text-sm text-ink-2">
                        {s.venue.name} · {SKILL_LABEL[s.skillLevel]} · {s.courtCount} courts
                      </p>
                      <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-ink-2">
                        <span className="h-1.5 flex-1 overflow-hidden rounded bg-line">
                          <i
                            className={cx('block h-full rounded', fill > 0.8 ? 'bg-warn' : 'bg-kitchen')}
                            style={{ width: `${fill * 100}%` }}
                          />
                        </span>
                        {s.spotsLeft ? `${s.spotsLeft} spots left` : 'Full'}
                      </div>
                    </div>
                    <div className="text-right">
                      <b>{peso(s.feeCents)}</b>
                      {s.status === 'LIVE' && (
                        <div className="mt-1">
                          <Badge tone="kitchen">Live</Badge>
                        </div>
                      )}
                      {s.myStatus && <span className="mt-1 block text-[11px] font-extrabold text-kitchen">Joined</span>}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ))
      )}
    </>
  );
}
