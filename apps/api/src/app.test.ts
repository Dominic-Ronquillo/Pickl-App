import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';

const app = createApp();

describe('HTTP contract', () => {
  it('returns the error shape for unknown endpoints', async () => {
    const res = await request(app).get('/nope');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: 'NOT_FOUND', message: 'No such endpoint' } });
  });

  it('requires a token for player routes', async () => {
    const res = await request(app).get('/api/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('rejects an invalid token', async () => {
    const res = await request(app).get('/api/me').set('Authorization', 'Bearer not-a-jwt');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_EXPIRED');
  });

  it('answers malformed JSON with 400', async () => {
    const res = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{"email":');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_JSON');
  });

  it('validates request bodies before touching the database', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'not-an-email', password: '' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION');
    expect(res.body.error.fields).toHaveProperty('email');
  });

  it('sends security headers', async () => {
    const res = await request(app).get('/nope');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
