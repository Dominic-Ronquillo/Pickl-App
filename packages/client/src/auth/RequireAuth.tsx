import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from './auth-context';

/**
 * Sends signed-out visitors to /login and back here afterwards.
 * In the venue app it also signs out accounts that no longer manage a venue.
 */
export function RequireAuth() {
  const { side, user, venues } = useAuth();
  const location = useLocation();
  if (!user || (side === 'venue' && venues.length === 0)) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}
