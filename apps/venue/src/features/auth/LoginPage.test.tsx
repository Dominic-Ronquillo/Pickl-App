import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { RequireAuth } from '@courtside/client/auth';
import { Providers } from '@courtside/client/providers';
import { LoginPage } from './LoginPage';

function renderApp(initial = '/login') {
  const router = createMemoryRouter(
    [
      { path: '/login', element: <LoginPage /> },
      { element: <RequireAuth />, children: [{ path: '/', element: <p>Venue dashboard</p> }] },
    ],
    { initialEntries: [initial] },
  );
  render(
    <Providers side="venue">
      <RouterProvider router={router} />
    </Providers>,
  );
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const owner = {
  token: 'abc',
  user: { id: 'u1', name: 'Rally House Owner', email: 'owner@x.test', phone: null, rating: '3.00' },
  venues: [{ id: 'v1', name: 'Rally House', role: 'OWNER' }],
};

async function fillAndSubmit(email: string) {
  await userEvent.type(screen.getByLabelText('Email'), email);
  await userEvent.type(screen.getByLabelText('Password'), 'password123');
  await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
}

afterEach(() => vi.restoreAllMocks());

describe('venue sign-in', () => {
  it('signs staff in as venue and opens the dashboard', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(owner));
    renderApp();
    await fillAndSubmit('owner@x.test');
    expect(await screen.findByText('Venue dashboard')).toBeInTheDocument();
    expect(JSON.parse(fetch.mock.calls[0]![1]!.body as string)).toMatchObject({ as: 'venue' });
  });

  it('explains when a player-only account tries to sign in', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      json({ error: { code: 'NOT_VENUE_STAFF', message: 'This account doesn’t manage a venue.' } }, 403),
    );
    renderApp();
    await fillAndSubmit('andrea@x.test');
    expect(await screen.findByRole('alert')).toHaveTextContent('This account doesn’t manage a venue.');
  });

  it('keeps signed-out visitors on the sign-in page', () => {
    renderApp('/');
    expect(screen.getByRole('heading', { name: 'Venue sign in' })).toBeInTheDocument();
  });

  it('links players to the player app', () => {
    renderApp();
    expect(screen.getByRole('link', { name: 'Open the player app' })).toHaveAttribute('href', 'http://localhost:5173');
  });
});
