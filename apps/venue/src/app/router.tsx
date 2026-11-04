import { createBrowserRouter } from 'react-router';
import { RequireAuth } from '@courtside/client/auth';
import { AppShell } from '@/components/AppShell';
import { LoginPage } from '@/features/auth/LoginPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { NotFound, RouteError } from './RouteFallbacks';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    errorElement: <RouteError />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: '*', element: <NotFound /> },
        ],
      },
    ],
  },
]);
