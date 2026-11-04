import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { Providers } from '@courtside/client/providers';
import { router } from './app/router';
import './styles/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers side="player">
      <RouterProvider router={router} />
    </Providers>
  </StrictMode>,
);
