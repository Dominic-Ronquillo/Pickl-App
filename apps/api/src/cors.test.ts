import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';

const app = createApp();

describe('CORS', () => {
  it.each(['http://localhost:5173', 'http://localhost:5174'])('allows the %s web app', async (origin) => {
    const res = await request(app).get('/nope').set('Origin', origin);
    expect(res.headers['access-control-allow-origin']).toBe(origin);
  });

  it('does not allow other origins', async () => {
    const res = await request(app).get('/nope').set('Origin', 'https://evil.example');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
