import type { ReactNode } from 'react';
import { Logo } from '@/components/AppShell';

/** Split layout: court-blue brand panel on wide screens, single column on phones. */
export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-court p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <Logo light />
        <div className="relative z-10 max-w-md">
          <p className="display text-6xl">Your court is ready.</p>
          <p className="mt-4 text-lg text-white/80">
            Hourly court booking, open play by skill level, and live lineups so you always know when you’re up.
          </p>
        </div>
        {/* Court lines as decoration */}
        <div
          aria-hidden
          className="absolute top-16 right-[-80px] bottom-16 w-[420px] border-2 border-r-0 border-white/20"
        >
          <div className="absolute inset-y-0 left-[110px] w-[90px] border-l-2 border-white/20 bg-kitchen/50" />
        </div>
      </aside>
      <main className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h1 className="display text-4xl">{title}</h1>
          <p className="mt-2 mb-6 text-ink-2">{subtitle}</p>
          {children}
        </div>
      </main>
    </div>
  );
}
