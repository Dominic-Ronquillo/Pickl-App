import { cx } from './cx';

/**
 * Courtside wordmark. `product` names the app, e.g. "for venues"; `compact` hides it on phones,
 * where the app header has no room for it.
 */
export function Logo({ light, product, compact }: { light?: boolean; product?: string; compact?: boolean }) {
  return (
    <span className={cx('flex items-center gap-2 text-xl font-extrabold [font-stretch:80%]', light && 'text-white')}>
      <img src="/favicon.svg" alt="" className="size-8" />
      Courtside
      {product && (
        <span
          className={cx(
            'font-semibold whitespace-nowrap [font-stretch:90%]',
            light ? 'text-white/75' : 'text-ink-3',
            compact && 'hidden sm:inline',
          )}
        >
          {product}
        </span>
      )}
    </span>
  );
}
