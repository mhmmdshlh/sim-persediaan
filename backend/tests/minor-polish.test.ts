import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import request from 'supertest';
import { createAndLoginOwner, createTestApp, resetDatabase, type TestContext } from './helpers.js';
import { isDirectEntryPoint } from '../src/db/seed.js';

describe('High-value minor polish verification', () => {
  let ctx: TestContext;
  let token: string;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.close();
  });

  beforeEach(async () => {
    await resetDatabase(ctx.db);
    token = await createAndLoginOwner(ctx.app, ctx.db);
  });

  it('Minor 1: OpenAPI spec includes path parameters on all /{id} routes and requestBody on PATCH/kategori/satuan', async () => {
    const res = await request(ctx.app).get('/api/openapi.json');
    expect(res.status).toBe(200);
    const paths = res.body.paths;

    for (const idPath of [
      '/api/kategori/{id}',
      '/api/satuan/{id}',
      '/api/pemasok/{id}',
      '/api/bahan/{id}',
      '/api/transaksi/{id}',
    ]) {
      expect(paths[idPath].parameters).toEqual(
        expect.arrayContaining([expect.objectContaining({ name: 'id', in: 'path', required: true })]),
      );
    }

    expect(paths['/api/kategori'].post.requestBody).toBeDefined();
    expect(paths['/api/kategori/{id}'].patch.requestBody).toBeDefined();
    expect(paths['/api/satuan'].post.requestBody).toBeDefined();
    expect(paths['/api/satuan/{id}'].patch.requestBody).toBeDefined();
    expect(paths['/api/pemasok/{id}'].patch.requestBody).toBeDefined();
    expect(paths['/api/bahan/{id}'].patch.requestBody).toBeDefined();
  });

  it('Minor 4: database rejects direct negative stok_saat_ini via CHECK constraint on bahan', async () => {
    const kat = (
      await request(ctx.app)
        .post('/api/kategori')
        .set('Authorization', `Bearer ${token}`)
        .send({ nama_kategori: 'Bahan Utama' })
    ).body.data.id_kategori;
    const sat = (
      await request(ctx.app)
        .post('/api/satuan')
        .set('Authorization', `Bearer ${token}`)
        .send({ nama_satuan: 'kg' })
    ).body.data.id_satuan;

    await expect(
      ctx.db.execute(
        sql`INSERT INTO bahan (nama_bahan, id_kategori, id_satuan, stok_saat_ini, stok_minimum) VALUES ('TestNeg', ${kat}, ${sat}, -1.00, 0)`,
      ),
    ).rejects.toThrow();
  });

  it('Minor 7: Windows drive-letter case differences still match seed direct execution check', () => {
    expect(
      isDirectEntryPoint(
        'd:\\HBB\\project\\src\\db\\seed.ts',
        'D:\\HBB\\project\\src\\db\\seed.ts',
        'win32',
      ),
    ).toBe(true);
  });

  it('Minor 8: clears login failed attempts after successful login and rejects impossible calendar date 2026-02-31', async () => {
    for (let i = 0; i < 6; i++) {
      const fail = await request(ctx.app)
        .post('/api/auth/login')
        .send({ username: 'pemilik', password: 'salah' });
      expect(fail.status).toBe(401);
    }

    const ok = await request(ctx.app)
      .post('/api/auth/login')
      .send({ username: 'pemilik', password: 'bledek123' });
    expect(ok.status).toBe(200);

    // After reset, 6 more failures must still return 401 (not 429)
    for (let i = 0; i < 6; i++) {
      const failAgain = await request(ctx.app)
        .post('/api/auth/login')
        .send({ username: 'pemilik', password: 'salah' });
      expect(failAgain.status).toBe(401);
    }

    const invalidDate = await request(ctx.app)
      .get('/api/laporan?start_date=2026-02-31')
      .set('Authorization', `Bearer ${token}`);
    expect(invalidDate.status).toBe(422);
    expect(invalidDate.body.error.code).toBe('VALIDATION_ERROR');
  });
});
