import { APP_URLS } from '@courtside/client/apps';
import { useAuth } from '@courtside/client/auth';
import { AppShell as Shell, OtherAppLink, type NavItem } from '@courtside/ui';

const NAV: NavItem[] = [
  { to: '/', label: 'Home', icon: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z', end: true },
  { to: '/open-play', label: 'Open play', icon: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 4v5l3 2' },
  { to: '/book', label: 'Book', icon: 'M4 5h16v15H4zM4 10h16M9 3v4M15 3v4' },
];

export function AppShell() {
  const { venues } = useAuth();
  return (
    <Shell
      nav={NAV}
      actions={venues.length > 0 && <OtherAppLink href={APP_URLS.venue}>Venue dashboard</OtherAppLink>}
    />
  );
}
