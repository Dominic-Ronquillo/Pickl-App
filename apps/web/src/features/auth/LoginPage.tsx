import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { ApiError, errorMessage } from '@/lib/api';
import { Button, Field, Segmented } from '@/components/ui';
import { AuthLayout } from './AuthLayout';
import { useAuth } from './auth-context';
import type { Mode } from '@/types/api';

export function LoginPage() {
  const { user, mode: currentMode, signIn } = useAuth();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from;
  const [as, setAs] = useState<Mode>('player');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={currentMode === 'venue' ? '/venue' : '/'} replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn({ email, password, as });
      navigate(from ?? (as === 'venue' ? '/venue' : '/'), { replace: true });
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  }

  const fields = error instanceof ApiError ? error.fields : undefined;

  return (
    <AuthLayout title="Sign in" subtitle="Book courts, join open play and see who’s up next.">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Segmented
          label="Sign in as"
          value={as}
          onChange={setAs}
          options={[
            { value: 'player', label: 'Player' },
            { value: 'venue', label: 'Venue owner' },
          ]}
        />
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fields?.email?.[0]}
        />
        <Field
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fields?.password?.[0]}
        />
        {error != null && !fields && (
          <p role="alert" className="text-sm text-danger">
            {errorMessage(error)}
          </p>
        )}
        <Button type="submit" loading={busy} className="w-full">
          Sign in
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-2">
        New to Courtside?{' '}
        <Link to="/register" className="font-bold text-court-text">
          Create a player account
        </Link>
      </p>
      {import.meta.env.DEV && (
        <p className="mt-4 rounded-xl bg-ball/30 p-3 text-xs text-ink-2">
          Demo: <b>andrea.cruz@player.test</b> or <b>owner@rallyhouse.test</b>, password <b>password123</b>
        </p>
      )}
    </AuthLayout>
  );
}
