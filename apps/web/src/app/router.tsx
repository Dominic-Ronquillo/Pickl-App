import { createBrowserRouter } from 'react-router';
import { AppShell } from '@/components/AppShell';
import { NotFound, RouteError } from './RouteFallbacks';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { LoginPage } from '@/features/auth/LoginPage';
import { RegisterPage } from '@/features/auth/RegisterPage';
import { HomePage } from '@/features/home/HomePage';
import { BookPage } from '@/features/booking/BookPage';
import { OpenPlayPage } from '@/features/openplay/OpenPlayPage';
import { SessionPage } from '@/features/openplay/SessionPage';
import { QueueRulesPage } from '@/features/openplay/QueueRulesPage';
import { VenueDashboardPage } from '@/features/venue/VenueDashboardPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    element: <RequireAuth />,
    errorElement: <RouteError />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'book', element: <BookPage /> },
          { path: 'open-play', element: <OpenPlayPage /> },
          { path: 'open-play/rules', element: <QueueRulesPage /> },
          { path: 'open-play/:sessionId', element: <SessionPage /> },
          { element: <RequireAuth venue />, children: [{ path: 'venue', element: <VenueDashboardPage /> }] },
          { path: '*', element: <NotFound /> },
        ],
      },
    ],
  },
]);
