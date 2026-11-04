import { NavLink, Outlet, useNavigate } from 'react-router';
import { cx } from '@/lib/cx';
import { useAuth } from '@/features/auth/auth-context';
import { Avatar } from './ui';

const PLAYER_NAV = [
  { to: '/', label: 'Home', icon: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z', end: true },
  { to: '/open-play', label: 'Open play', icon: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 4v5l3 2' },
  { to: '/book', label: 'Book', icon: 'M4 5h16v15H4zM4 10h16M9 3v4M15 3v4' },
];
const VENUE_NAV = [{ to: '/venue', label: 'Dashboard', icon: 'M4 20V10m6 10V4m6 16v-7m4 7H2', end: true }];

function Icon({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-6 flex-none"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={d} />
    </svg>
  );
}

export function Logo({ light }: { light?: boolean }) {
  return (
    <span className={cx('flex items-center gap-2 text-xl font-extrabold [font-stretch:80%]', light && 'text-white')}>
      <img src="/favicon.svg" alt="" className="size-8" />
      Courtside
    </span>
  );
}

/**
 * Responsive layout: a top bar with navigation on wide screens, a bottom tab bar on phones.
 * The venue side uses a court-blue header, as in the prototype.
 */
export function AppShell() {
  const { user, venues, mode, setMode, signOut } = useAuth();
  const navigate = useNavigate();
  const venueSide = mode === 'venue';
  const nav = venueSide ? VENUE_NAV : PLAYER_NAV;

  const switchSide = () => {
    setMode(venueSide ? 'player' : 'venue');
    navigate(venueSide ? '/' : '/venue');
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <header
        className={cx(
          'sticky top-0 z-20 border-b',
          venueSide ? 'border-court-deep bg-court text-white' : 'border-line bg-card/95 backdrop-blur',
        )}
      >
        <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
          <NavLink to={venueSide ? '/venue' : '/'} aria-label="Courtside home">
            <Logo light={venueSide} />
          </NavLink>
          <nav aria-label="Main" className="hidden flex-1 gap-1 sm:flex">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  cx(
                    'rounded-xl px-3 py-2 text-sm font-semibold',
                    isActive
                      ? venueSide
                        ? 'bg-white/15'
                        : 'bg-court/10 text-court-text'
                      : venueSide
                        ? 'text-white/80 hover:text-white'
                        : 'text-ink-2 hover:text-ink',
                  )
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2 sm:ml-0">
            {venues.length > 0 && (
              <button
                onClick={switchSide}
                className={cx(
                  'rounded-full px-3 py-1.5 text-sm font-semibold',
                  venueSide ? 'bg-white text-court-deep' : 'border-[1.5px] border-line',
                )}
              >
                {venueSide ? 'Player side' : 'Venue side'}
              </button>
            )}
            <button
              onClick={signOut}
              className="rounded-full"
              aria-label={`Sign out ${user?.name ?? ''}`}
              title="Sign out"
            >
              <Avatar name={user?.name ?? '?'} size={36} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-28 sm:pb-12">
        <Outlet />
      </main>

      <nav
        aria-label="Tabs"
        className="fixed inset-x-0 bottom-0 z-20 grid border-t border-line bg-card px-1.5 pt-1.5 pb-[calc(10px+env(safe-area-inset-bottom,0px))] sm:hidden"
        style={{ gridTemplateColumns: `repeat(${nav.length}, 1fr)` }}
      >
        {nav.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) =>
              cx(
                'flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-semibold',
                isActive ? 'text-court-text' : 'text-ink-3',
              )
            }
          >
            <Icon d={n.icon} />
            {n.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
