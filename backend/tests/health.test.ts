import { afterEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createTestApp, type TestContext } from './helpers.js';
import { parseEnv } from '../src/config/env.js';
import { isPreWeekendWib, todayWib } from '../src/lib/time.js';

describe('Foundation, health, error handling, env, and WIB timezone', () => {
  let ctx: TestContext | null = null;

  afterEach(async () => {
    if (ctx) {
      await ctx.close();
      ctx = null;
    }
  });

  it('returns 200 with connected database status on GET /api/health', async () => {
    ctx = await createTestApp();
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
    ctx = await createTestApp();
    const res = await request(ctx.app).get('/api/tidak-ada');

    expect(res.status).toBe(404);
    expect(res.body.error?.code).toBe('NOT_FOUND');
    expect(typeof res.body.error?.message).toBe('string');
  });

  it('returns 400 INVALID_JSON without stack trace on malformed JSON body', async () => {
    ctx = await createTestApp();
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
    // 2026-11-26T18:00:00Z is Friday 2026-11-27 01:00 WIB (Thursday in UTC)
    const fridayEarlyWib = new Date('2026-11-26T18:00:00.000Z');
    expect(todayWib(fridayEarlyWib)).toBe('2026-11-27');
    expect(isPreWeekendWib(fridayEarlyWib)).toBe(true);

    // 2026-11-28T18:00:00Z is Sunday 2026-11-29 01:00 WIB (Saturday in UTC)
    const sundayEarlyWib = new Date('2026-11-28T18:00:00.000Z');
    expect(todayWib(sundayEarlyWib)).toBe('2026-11-29');
    expect(isPreWeekendWib(sundayEarlyWib)).toBe(false);
  });
});
