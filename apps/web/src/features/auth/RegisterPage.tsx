import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { ApiError, errorMessage } from '@/lib/api';
import { Button, Field, Segmented } from '@/components/ui';
import { AuthLayout } from './AuthLayout';
import { useAuth } from './auth-context';
import type { SkillLevel } from '@/types/api';

type Level = Exclude<SkillLevel, 'ALL'>;

export function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [skillLevel, setSkillLevel] = useState<Level>('INTERMEDIATE');
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const set = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await register({ ...form, phone: form.phone || undefined, skillLevel });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  }

  const fields = error instanceof ApiError ? error.fields : undefined;

  return (
    <AuthLayout title="Create account" subtitle="Your skill level sets your starting rating. It updates as you play.">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field
          label="Full name"
          autoComplete="name"
          required
          value={form.name}
          onChange={set('name')}
          error={fields?.name?.[0]}
        />
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={form.email}
          onChange={set('email')}
          error={fields?.email?.[0]}
        />
        <Field
          label="Mobile number (optional)"
          type="tel"
          autoComplete="tel"
          value={form.phone}
          onChange={set('phone')}
          error={fields?.phone?.[0]}
        />
        <Field
          label="Password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={form.password}
          onChange={set('password')}
          error={fields?.password?.[0]}
        />
        <div>
          <span className="mb-1.5 block text-sm font-semibold">Skill level</span>
          <Segmented
            label="Skill level"
            value={skillLevel}
            onChange={setSkillLevel}
            options={[
              { value: 'BEGINNER', label: 'Beginner' },
              { value: 'INTERMEDIATE', label: 'Intermediate' },
              { value: 'ADVANCED', label: 'Advanced' },
            ]}
          />
        </div>
        {error != null && !fields && (
          <p role="alert" className="text-sm text-danger">
            {errorMessage(error)}
          </p>
        )}
        <Button type="submit" loading={busy} className="w-full">
          Create account
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-2">
        Already playing?{' '}
        <Link to="/login" className="font-bold text-court-text">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
