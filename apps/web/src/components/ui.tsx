import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import { errorMessage } from '@/lib/api';
import { initials } from '@/lib/format';
import { cx } from '@/lib/cx';

type Variant = 'primary' | 'court' | 'outline' | 'ghost' | 'danger';
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-ball text-ball-ink hover:brightness-95',
  court: 'bg-court text-white hover:bg-court-deep',
  outline: 'border-[1.5px] border-line text-ink hover:bg-card',
  ghost: 'text-court-text hover:bg-line/50',
  danger: 'border-[1.5px] border-line text-danger hover:bg-danger/10',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  className,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md'; loading?: boolean }) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        'inline-flex items-center justify-center gap-2 font-bold transition disabled:cursor-not-allowed disabled:opacity-45',
        size === 'md' ? 'rounded-2xl px-5 py-3 text-base' : 'rounded-xl px-3.5 py-2 text-sm',
        VARIANTS[variant],
        className,
      )}
    >
      {loading && <Spinner small />}
      {children}
    </button>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx('rounded-[18px] border border-line bg-card p-4', className)}>{children}</div>;
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mt-8 mb-3 flex items-baseline justify-between gap-2">
      <h2 className="text-[19px] font-bold [font-stretch:80%]">{children}</h2>
      {action}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="mb-2 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="display text-[30px] sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-2">{subtitle}</p>}
      </div>
      {children}
    </header>
  );
}

export function Spinner({ small }: { small?: boolean }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cx(
        'inline-block animate-spin rounded-full border-2 border-current border-r-transparent',
        small ? 'size-4' : 'size-6',
      )}
    />
  );
}

export function Loading() {
  return (
    <div className="grid place-items-center py-16 text-ink-3">
      <Spinner />
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-[18px] border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
      {errorMessage(error)}
      {onRetry && (
        <button className="ml-2 font-bold underline" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-[18px] border-2 border-dashed border-line p-5 text-center text-ink-2">{children}</div>;
}

const AVATAR_COLORS = ['#1D4E89', '#3E8E5E', '#B4541A', '#6B4FA0', '#0F7C8C', '#A23B72'];

export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const color = AVATAR_COLORS[[...name].reduce((n, c) => n + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
  return (
    <span
      title={name}
      className="grid flex-none place-items-center rounded-full text-[11px] font-extrabold text-white"
      style={{ width: size, height: size, background: color }}
    >
      {initials(name)}
    </span>
  );
}

export function Badge({
  tone = 'neutral',
  children,
}: {
  tone?: 'neutral' | 'court' | 'kitchen' | 'ball' | 'warn';
  children: ReactNode;
}) {
  const tones = {
    neutral: 'bg-line text-ink-2',
    court: 'bg-court text-white',
    kitchen: 'bg-kitchen text-white',
    ball: 'bg-ball text-ball-ink',
    warn: 'bg-warn text-white',
  };
  return (
    <span className={cx('rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap', tones[tone])}>
      {children}
    </span>
  );
}

/** Pill toggle group (skill levels, venues). */
export function Chips<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
      {options.map((o) => (
        <button
          key={o.value}
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className="rounded-full border-[1.5px] border-line bg-card px-3.5 py-1.5 text-[13px] font-semibold whitespace-nowrap text-ink-2 aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-surface"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Segmented control (1 hour / 2 hours, Player / Venue owner). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex rounded-xl border border-line bg-card p-[3px]">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className="flex-1 rounded-[9px] px-3 py-2 text-[13px] font-semibold text-ink-2 aria-pressed:bg-court aria-pressed:text-white"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Field({
  label,
  error,
  ...input
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold">{label}</span>
      <input
        {...input}
        aria-invalid={error ? true : undefined}
        className="w-full rounded-xl border-[1.5px] border-line bg-card px-3.5 py-3 text-base outline-none focus:border-court aria-invalid:border-danger"
      />
      {error && <span className="mt-1 block text-sm text-danger">{error}</span>}
    </label>
  );
}
