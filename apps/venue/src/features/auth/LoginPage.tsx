import { APP_URLS } from '@courtside/client/apps';
import { AuthLayout, SignInForm } from '@courtside/ui';

export function LoginPage() {
  return (
    <AuthLayout
      product="for venues"
      title="Venue sign in"
      subtitle="For owners, managers and front-desk staff."
      headline="Run a full house."
      lede="Today’s revenue and court use, live court status and open play check-ins in one place."
    >
      <SignInForm demoHint="owner@rallyhouse.test" />
      <p className="mt-6 text-center text-sm text-ink-2">
        Here to play?{' '}
        <a href={APP_URLS.player} className="font-bold text-court-text">
          Open the player app
        </a>
      </p>
    </AuthLayout>
  );
}
