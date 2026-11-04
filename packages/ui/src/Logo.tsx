import { cx } from './cx';

/** Courtside wordmark. `product` names the app, e.g. "for venues". */
export function Logo({ light, product }: { light?: boolean; product?: string }) {
  return (
    <span className={cx('flex items-center gap-2 text-xl font-extrabold [font-stretch:80%]', light && 'text-white')}>
      <img src="/favicon.svg" alt="" className="size-8" />
      Courtside
      {product && (
        <span className={cx('font-semibold [font-stretch:90%]', light ? 'text-white/75' : 'text-ink-3')}>
          {product}
        </span>
      )}
    </span>
  );
}
