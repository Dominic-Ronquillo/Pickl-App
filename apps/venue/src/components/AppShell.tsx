import { APP_URLS } from '@courtside/client/apps';
import { AppShell as Shell, OtherAppLink, type NavItem } from '@courtside/ui';

/** Schedule, bookings, open play and settings join this list as they're built (docs/roadmap.md). */
const NAV: NavItem[] = [{ to: '/', label: 'Dashboard', icon: 'M4 20V10m6 10V4m6 16v-7m4 7H2', end: true }];

export function AppShell() {
  return (
    <Shell
      nav={NAV}
      tone="court"
      product="for venues"
      actions={
        <OtherAppLink href={APP_URLS.player} light>
          Player app
        </OtherAppLink>
      }
    />
  );
}
