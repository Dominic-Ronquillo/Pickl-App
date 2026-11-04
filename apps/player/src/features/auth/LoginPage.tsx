import { Link } from 'react-router';
import { APP_URLS } from '@courtside/client/apps';
import { AuthLayout, SignInForm } from '@courtside/ui';
import { PLAYER_AUTH } from './copy';

export function LoginPage() {
  return (
    <AuthLayout title="Sign in" subtitle="Book courts, join open play and see who’s up next." {...PLAYER_AUTH}>
      <SignInForm demoHint="andrea.cruz@player.test" />
      <p className="mt-6 text-center text-sm text-ink-2">
        New to Courtside?{' '}
        <Link to="/register" className="font-bold text-court-text">
          Create a player account
        </Link>
      </p>
      <p className="mt-2 text-center text-sm text-ink-2">
        Run a venue?{' '}
        <a href={APP_URLS.venue} className="font-bold text-court-text">
          Courtside for venues
        </a>
      </p>
    </AuthLayout>
  );
}
