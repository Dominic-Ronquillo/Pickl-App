import type { ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router';
import { useAuth } from '@courtside/client/auth';
import { cx } from './cx';
import { Logo } from './Logo';
import { Avatar } from './ui';

export interface NavItem {
  to: string;
  label: string;
  /** SVG path data for the phone tab bar icon (24×24, stroked). */
  icon: string;
  end?: boolean;
}

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

/**
 * Responsive app layout shared by both apps: a top bar with navigation on wide screens and a
 * bottom tab bar on phones. `tone="court"` is the court-blue header the venue app uses.
 */
export function AppShell({
  nav,
  tone = 'light',
  product,
  actions,
}: {
  nav: NavItem[];
  tone?: 'light' | 'court';
  product?: string;
  /** Extra controls before the account button, e.g. a link to the other app. */
  actions?: ReactNode;
}) {
  const { user, signOut } = useAuth();
  const court = tone === 'court';

  return (
    <div className="flex min-h-dvh flex-col">
      <header
        className={cx(
          'sticky top-0 z-20 border-b',
          court ? 'border-court-deep bg-court text-white' : 'border-line bg-card/95 backdrop-blur',
        )}
      >
        <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
          <NavLink to="/" aria-label="Courtside home">
            <Logo light={court} product={product} compact />
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
                      ? court
                        ? 'bg-white/15'
                        : 'bg-court/10 text-court-text'
                      : court
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
            {actions}
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

      {nav.length > 1 && (
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
      )}
    </div>
  );
}

/** Pill link to the other Courtside app (owners who also play). */
export function OtherAppLink({ href, children, light }: { href: string; children: ReactNode; light?: boolean }) {
  return (
    <a
      href={href}
      className={cx(
        'rounded-full px-3 py-1.5 text-sm font-semibold whitespace-nowrap',
        light ? 'bg-white text-court-deep' : 'border-[1.5px] border-line hover:bg-card',
      )}
    >
      {children}
    </a>
  );
}
