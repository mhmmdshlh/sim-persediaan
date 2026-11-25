import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import request from 'supertest';
import { createTestApp, type TestContext } from './helpers.js';
import { users } from '../src/db/schema.js';
import { hashPassword } from '../src/lib/password.js';

describe('Authentication, session cookie/bearer, and serverless login rate limiting', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.close();
  });

  beforeEach(async () => {
    await ctx.db.execute(sql`TRUNCATE TABLE login_attempts, detail_transaksi, transaksi, bahan, pemasok, satuan, kategori, users RESTART IDENTITY CASCADE`);
    const passwordHash = await hashPassword('bledek123');
    await ctx.db.insert(users).values({
      username: 'pemilik',
      nama: 'Ramadhono Wahyu Nugroho',
      password_hash: passwordHash,
      aktif: true,
    });
  });

  it('logs in with valid credentials, returns token and httpOnly cookie without password_hash', async () => {
    const res = await request(ctx.app)
      .post('/api/auth/login')
      .send({ username: '  Pemilik  ', password: 'bledek123' });

    expect(res.status).toBe(200);
    expect(res.body.data.user).toEqual({
      id_user: 1,
      username: 'pemilik',
      nama: 'Ramadhono Wahyu Nugroho',
    });
    expect(res.body.data.user.password_hash).toBeUndefined();
    expect(typeof res.body.data.token).toBe('string');

    const cookies = res.headers['set-cookie'];
    expect(Array.isArray(cookies)).toBe(true);
    const sessionCookie = cookies.find((c: string) => c.startsWith('stok_bledek_session='));
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie).toContain('HttpOnly');
    expect(sessionCookie).toContain('SameSite=Lax');
  });

  it('authenticates GET /api/auth/me using either cookie or Bearer token', async () => {
    const loginRes = await request(ctx.app)
      .post('/api/auth/login')
      .send({ username: 'pemilik', password: 'bledek123' });

    const token = loginRes.body.data.token as string;
    const cookieHeader = (loginRes.headers['set-cookie'] as string[])[0].split(';')[0];

    const byCookie = await request(ctx.app).get('/api/auth/me').set('Cookie', cookieHeader);
    expect(byCookie.status).toBe(200);
    expect(byCookie.body.data.username).toBe('pemilik');

    const byBearer = await request(ctx.app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(byBearer.status).toBe(200);
    expect(byBearer.body.data.nama).toBe('Ramadhono Wahyu Nugroho');
  });

  it('rejects unauthenticated or invalid token requests to GET /api/auth/me with 401', async () => {
    const noAuth = await request(ctx.app).get('/api/auth/me');
    expect(noAuth.status).toBe(401);
    expect(noAuth.body.error.code).toBe('UNAUTHENTICATED');

    const badToken = await request(ctx.app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer token-tidak-valid');
    expect(badToken.status).toBe(401);
    expect(badToken.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('rejects deactivated users on both login and existing tokens', async () => {
    const loginRes = await request(ctx.app)
      .post('/api/auth/login')
      .send({ username: 'pemilik', password: 'bledek123' });
    const token = loginRes.body.data.token as string;

    await ctx.db.update(users).set({ aktif: false }).where(eq(users.username, 'pemilik'));

    const meRes = await request(ctx.app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(meRes.status).toBe(401);

    const reloginRes = await request(ctx.app)
      .post('/api/auth/login')
      .send({ username: 'pemilik', password: 'bledek123' });
    expect(reloginRes.status).toBe(401);
  });

  it('enforces DB-backed login rate limit after 10 failed attempts and clears on success', async () => {
    for (let i = 0; i < 10; i++) {
      const failRes = await request(ctx.app)
        .post('/api/auth/login')
        .send({ username: 'pemilik', password: 'salah' });
      expect(failRes.status).toBe(401);
      expect(failRes.body.error.code).toBe('INVALID_CREDENTIALS');
    }

    const blockedRes = await request(ctx.app)
      .post('/api/auth/login')
      .send({ username: 'pemilik', password: 'bledek123' });
    expect(blockedRes.status).toBe(429);
    expect(blockedRes.body.error.code).toBe('RATE_LIMITED');
  });

  it('clears the session cookie on POST /api/auth/logout', async () => {
    const res = await request(ctx.app).post('/api/auth/logout');
    expect(res.status).toBe(200);
    const cookies = res.headers['set-cookie'] as string[];
    expect(cookies.some((c) => c.startsWith('stok_bledek_session=;'))).toBe(true);
  });
});
