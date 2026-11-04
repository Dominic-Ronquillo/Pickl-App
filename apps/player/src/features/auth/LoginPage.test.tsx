import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { Providers } from '@courtside/client/providers';
import { LoginPage } from './LoginPage';

function renderLogin() {
  const router = createMemoryRouter(
    [
      { path: '/login', element: <LoginPage /> },
      { path: '/', element: <p>Player home</p> },
    ],
    { initialEntries: ['/login'] },
  );
  render(
    <Providers side="player">
      <RouterProvider router={router} />
    </Providers>,
  );
}

const session = (venues: unknown[] = []) => ({
  token: 'abc',
  user: { id: 'u1', name: 'Andrea Cruz', email: 'a@x.test', phone: null, rating: '3.50' },
  venues,
});

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

afterEach(() => vi.restoreAllMocks());

async function fillAndSubmit(email: string, password: string) {
  await userEvent.type(screen.getByLabelText('Email'), email);
  await userEvent.type(screen.getByLabelText('Password'), password);
  await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
}

describe('LoginPage', () => {
  it('signs a player in and opens the player side', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(session()));
    renderLogin();
    await fillAndSubmit('a@x.test', 'password123');

    expect(await screen.findByText('Player home')).toBeInTheDocument();
    expect(JSON.parse(fetch.mock.calls[0]![1]!.body as string)).toEqual({
      email: 'a@x.test',
      password: 'password123',
      as: 'player',
    });
    expect(localStorage.getItem('courtside.token')).toBe('abc');
  });

  it('shows the API message when sign-in fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      json({ error: { code: 'BAD_CREDENTIALS', message: 'Email or password is incorrect.' } }, 401),
    );
    renderLogin();
    await fillAndSubmit('a@x.test', 'wrong');
    expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is incorrect.');
  });
});
