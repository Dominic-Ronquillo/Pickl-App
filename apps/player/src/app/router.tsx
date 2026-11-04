import { createBrowserRouter } from 'react-router';
import { RequireAuth } from '@courtside/client/auth';
import { AppShell } from '@/components/AppShell';
import { LoginPage } from '@/features/auth/LoginPage';
import { RegisterPage } from '@/features/auth/RegisterPage';
import { HomePage } from '@/features/home/HomePage';
import { BookPage } from '@/features/booking/BookPage';
import { OpenPlayPage } from '@/features/openplay/OpenPlayPage';
import { SessionPage } from '@/features/openplay/SessionPage';
import { QueueRulesPage } from '@/features/openplay/QueueRulesPage';
import { NotFound, RouteError } from './RouteFallbacks';

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
          { path: '*', element: <NotFound /> },
        ],
      },
    ],
  },
]);
