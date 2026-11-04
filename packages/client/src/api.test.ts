import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError, tokenStore, UNAUTHORIZED_EVENT } from './api';

const respond = (status: number, body: unknown) =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(body), { status }));

afterEach(() => vi.restoreAllMocks());

describe('api', () => {
  it('sends the bearer token and JSON body', async () => {
    tokenStore.set('t0ken');
    const fetch = respond(200, { ok: true });
    await api('/bookings', { method: 'POST', body: { courtId: 'c1' } });
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe('/api/bookings');
    expect(init?.headers).toMatchObject({ Authorization: 'Bearer t0ken', 'Content-Type': 'application/json' });
    expect(init?.body).toBe('{"courtId":"c1"}');
  });

  it('turns the API error shape into an ApiError', async () => {
    respond(409, { error: { code: 'SESSION_FULL', message: 'This session is full' } });
    await expect(api('/x')).rejects.toMatchObject({
      status: 409,
      code: 'SESSION_FULL',
      message: 'This session is full',
    });
  });

  it('signals sign-out when a token is rejected', async () => {
    tokenStore.set('expired');
    const listener = vi.fn();
    window.addEventListener(UNAUTHORIZED_EVENT, listener);
    respond(401, { error: { code: 'TOKEN_EXPIRED', message: 'Your session has expired. Sign in again.' } });
    await expect(api('/me')).rejects.toBeInstanceOf(ApiError);
    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener(UNAUTHORIZED_EVENT, listener);
  });

  it('reports network failures in plain words', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(api('/x')).rejects.toMatchObject({ code: 'NETWORK' });
  });
});
