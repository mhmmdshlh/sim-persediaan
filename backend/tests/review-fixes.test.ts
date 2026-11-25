import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createAndLoginOwner, createTestApp, resetDatabase, type TestContext } from './helpers.js';
import { parseEnv } from '../src/config/env.js';
import { createPgPool } from '../src/db/client.js';

describe('Whole-branch review regression tests (Critical & Important fixes)', () => {
  let ctx: TestContext;
  let token: string;
  let idKat: number;
  let idSat: number;
  let idSup: number;
  let idAyam: number;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.close();
  });

  beforeEach(async () => {
    await resetDatabase(ctx.db);
    token = await createAndLoginOwner(ctx.app, ctx.db);

    idKat = (
      await request(ctx.app)
        .post('/api/kategori')
        .set('Authorization', `Bearer ${token}`)
        .send({ nama_kategori: 'Bahan Utama' })
    ).body.data.id_kategori;
    idSat = (
      await request(ctx.app)
        .post('/api/satuan')
        .set('Authorization', `Bearer ${token}`)
        .send({ nama_satuan: 'kg' })
    ).body.data.id_satuan;
    idSup = (
      await request(ctx.app)
        .post('/api/pemasok')
        .set('Authorization', `Bearer ${token}`)
        .send({ nama_pemasok: 'Agen Ayam', no_telepon: '0812', alamat: 'Gunungpati' })
    ).body.data.id_pemasok;
    idAyam = (
      await request(ctx.app)
        .post('/api/bahan')
        .set('Authorization', `Bearer ${token}`)
        .send({ nama_bahan: 'Ayam', id_kategori: idKat, id_satuan: idSat, stok_minimum: 5 })
    ).body.data.id_bahan;
  });

  it('Critical 1: vercel.json does not rewrite catch-all routes to /src/index.ts', () => {
    const raw = fs.readFileSync(path.resolve(process.cwd(), 'vercel.json'), 'utf8');
    const parsed = JSON.parse(raw) as { rewrites?: Array<{ destination?: string }> };
    const destinations = (parsed.rewrites ?? []).map((r) => r.destination);
    expect(destinations).not.toContain('/src/index.ts');
  });

  it('Critical 2: concurrent double DELETE /api/transaksi/:id reverses stock only once', async () => {
    await request(ctx.app)
      .post('/api/transaksi')
      .set('Authorization', `Bearer ${token}`)
      .send({
        waktu_transaksi: '2026-11-24',
        jenis_transaksi: 'masuk',
        id_pemasok: idSup,
        catatan: 'Stok awal',
        detail: [{ id_bahan: idAyam, jumlah: 10, harga_beli_satuan: 38000 }],
      });

    const keluar = await request(ctx.app)
      .post('/api/transaksi')
      .set('Authorization', `Bearer ${token}`)
      .send({
        waktu_transaksi: '2026-11-25',
        jenis_transaksi: 'keluar',
        id_pemasok: null,
        catatan: 'Pakai 4 kg',
        detail: [{ id_bahan: idAyam, jumlah: 4, harga_beli_satuan: null }],
      });
    const txId = keluar.body.data.id_transaksi as string;

    const [d1, d2] = await Promise.all([
      request(ctx.app).delete(`/api/transaksi/${txId}`).set('Authorization', `Bearer ${token}`),
      request(ctx.app).delete(`/api/transaksi/${txId}`).set('Authorization', `Bearer ${token}`),
    ]);

    expect([d1.status, d2.status].sort((a, b) => a - b)).toEqual([200, 404]);

    const ayam = await request(ctx.app)
      .get(`/api/bahan/${idAyam}`)
      .set('Authorization', `Bearer ${token}`);
    expect(ayam.body.data.stok_saat_ini).toBe(10);
  });

  it('Critical 3: createPgPool attaches an error listener and serverless timeouts for Neon', async () => {
    const pool = createPgPool('postgresql://user:pass@localhost:5432/db', true);
    try {
      expect(pool.listenerCount('error')).toBeGreaterThanOrEqual(1);
    } finally {
      await pool.end();
    }
  });

  it('Important 1: allows same-origin mutating requests (Swagger /docs) while blocking untrusted origins', async () => {
    const sameOrigin = await request(ctx.app)
      .post('/api/auth/login')
      .set('Host', 'api.bledek.local')
      .set('Origin', 'http://api.bledek.local')
      .send({ username: 'pemilik', password: 'bledek123' });
    expect(sameOrigin.status).toBe(200);

    const evilOrigin = await request(ctx.app)
      .post('/api/auth/login')
      .set('Host', 'api.bledek.local')
      .set('Origin', 'https://evil.example')
      .send({ username: 'pemilik', password: 'bledek123' });
    expect(evilOrigin.status).toBe(403);
    expect(evilOrigin.body.error.code).toBe('CORS_DENIED');
  });

  it('Important 2: enforces JWT_SECRET and DATABASE_URL whenever VERCEL=1 and sets Secure cookie', async () => {
    expect(() => parseEnv({ VERCEL: '1', NODE_ENV: 'development' })).toThrow(/JWT_SECRET/);
    expect(() =>
      parseEnv({
        VERCEL: '1',
        NODE_ENV: 'development',
        JWT_SECRET: 'a-very-secure-secret-key-with-at-least-32-chars',
      }),
    ).toThrow(/DATABASE_URL/);

    const vercelCtx = await createTestApp({ isVercel: true });
    try {
      await createAndLoginOwner(vercelCtx.app, vercelCtx.db);
      const loginRes = await request(vercelCtx.app)
        .post('/api/auth/login')
        .send({ username: 'pemilik', password: 'bledek123' });
      const cookies = loginRes.headers['set-cookie'] as string[];
      expect(cookies[0]).toContain('Secure');
    } finally {
      await vercelCtx.close();
    }
  });

  it('Important 3: rejects sub-cent jumlah, INT4/NUMERIC overflows, and >100kb bodies with 4xx instead of 500', async () => {
    const subCent = await request(ctx.app)
      .post('/api/transaksi')
      .set('Authorization', `Bearer ${token}`)
      .send({
        waktu_transaksi: '2026-11-25',
        jenis_transaksi: 'masuk',
        id_pemasok: idSup,
        catatan: '',
        detail: [{ id_bahan: idAyam, jumlah: 0.001, harga_beli_satuan: 38000 }],
      });
    expect(subCent.status).toBe(422);

    const overflowId = await request(ctx.app)
      .get('/api/bahan/9999999999')
      .set('Authorization', `Bearer ${token}`);
    expect(overflowId.status).toBe(400);
    expect(overflowId.body.error.code).toBe('INVALID_ID');

    const overflowNumeric = await request(ctx.app)
      .post('/api/bahan')
      .set('Authorization', `Bearer ${token}`)
      .send({ nama_bahan: 'Garam', id_kategori: idKat, id_satuan: idSat, stok_minimum: 99999999999999 });
    expect(overflowNumeric.status).toBe(422);

    const hugeBody = await request(ctx.app)
      .post('/api/auth/login')
      .send({ username: 'pemilik', password: 'a'.repeat(120 * 1024) });
    expect(hugeBody.status).toBe(413);
    expect(hugeBody.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('Important 4: rejects empty string, null, and boolean coercion on JSON numeric fields', async () => {
    const emptyStr = await request(ctx.app)
      .post('/api/bahan')
      .set('Authorization', `Bearer ${token}`)
      .send({ nama_bahan: 'Garam', id_kategori: idKat, id_satuan: idSat, stok_minimum: '' });
    expect(emptyStr.status).toBe(422);

    const boolVal = await request(ctx.app)
      .post('/api/bahan')
      .set('Authorization', `Bearer ${token}`)
      .send({ nama_bahan: 'Garam', id_kategori: true, id_satuan: idSat, stok_minimum: 1 });
    expect(boolVal.status).toBe(422);
  });

  it('Important 5: src/db/client.ts does not statically import @electric-sql/pglite at top level', () => {
    const clientSource = fs.readFileSync(
      path.resolve(process.cwd(), 'src', 'db', 'client.ts'),
      'utf8',
    );
    expect(clientSource).not.toMatch(/^import\s+.*from\s+['"]@electric-sql\/pglite['"]/m);
    expect(clientSource).not.toMatch(/^import\s+.*from\s+['"]drizzle-orm\/pglite['"]/m);
  });
});
