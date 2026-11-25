import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createTestApp, type TestContext } from './helpers.js';
import { parseEnv } from '../src/config/env.js';
import { isPreWeekendWib, todayWib } from '../src/lib/time.js';

describe('Foundation, health, error handling, env, and WIB timezone', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.close();
  });

  it('returns 200 with connected database status on GET /api/health', async () => {
    const res = await request(ctx.app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: {
        status: 'ok',
        db: 'connected',
        timezone: 'Asia/Jakarta',
      },
    });
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('returns 404 JSON envelope on unknown routes', async () => {
    const res = await request(ctx.app).get('/api/tidak-ada');

    expect(res.status).toBe(404);
    expect(res.body.error?.code).toBe('NOT_FOUND');
    expect(typeof res.body.error?.message).toBe('string');
  });

  it('returns 400 INVALID_JSON without stack trace on malformed JSON body', async () => {
    const res = await request(ctx.app)
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send('{"rusak":');

    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('INVALID_JSON');
    expect(JSON.stringify(res.body)).not.toContain('SyntaxError');
  });

  it('rejects missing JWT_SECRET in production env', () => {
    expect(() =>
      parseEnv({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      }),
    ).toThrow(/JWT_SECRET/);
  });

  it('computes WIB date and Friday/Saturday weekend warning accurately across UTC midnight', () => {
    const fridayEarlyWib = new Date('2026-11-26T18:00:00.000Z');
    expect(todayWib(fridayEarlyWib)).toBe('2026-11-27');
    expect(isPreWeekendWib(fridayEarlyWib)).toBe(true);

    const sundayEarlyWib = new Date('2026-11-28T18:00:00.000Z');
    expect(todayWib(sundayEarlyWib)).toBe('2026-11-29');
    expect(isPreWeekendWib(sundayEarlyWib)).toBe(false);
  });
});
