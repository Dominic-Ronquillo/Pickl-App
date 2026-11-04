import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from './auth-context';

/** Sends signed-out visitors to /login and back here afterwards. `venue` routes also need a staff role. */
export function RequireAuth({ venue }: { venue?: boolean }) {
  const { user, venues } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (venue && venues.length === 0) return <Navigate to="/" replace />;
  return <Outlet />;
}
