import { Link, useRouteError } from 'react-router';
import { Empty } from '@courtside/ui';

export function NotFound() {
  return (
    <Empty>
      Page not found.{' '}
      <Link to="/" className="font-bold text-court-text">
        Go home
      </Link>
    </Empty>
  );
}

export function RouteError() {
  const error = useRouteError();
  console.error(error);
  return (
    <div className="mx-auto max-w-md p-8">
      <Empty>
        Something broke on this page.{' '}
        <a href="/" className="font-bold text-court-text">
          Reload Courtside
        </a>
      </Empty>
    </div>
  );
}
