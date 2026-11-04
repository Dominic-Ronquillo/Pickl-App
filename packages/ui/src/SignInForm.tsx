import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { ApiError, errorMessage } from '@courtside/client/api';
import { useAuth } from '@courtside/client/auth';
import { Button, Field } from './ui';

/**
 * Email and password sign-in for either app; the app's AuthProvider decides whether it signs in
 * as a player or as venue staff. Returns to the page the visitor came from, or home.
 */
export function SignInForm({ demoHint }: { demoHint?: string }) {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={from} replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn({ email, password });
      navigate(from, { replace: true });
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  }

  const fields = error instanceof ApiError ? error.fields : undefined;

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
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
      {demoHint && import.meta.env.DEV && (
        <p className="rounded-xl bg-ball/30 p-3 text-xs text-ink-2">Demo: {demoHint}, password password123</p>
      )}
    </form>
  );
}
