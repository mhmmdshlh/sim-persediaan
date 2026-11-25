import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createTestApp, resetDatabase, type TestContext } from './helpers.js';
import { seedDatabase } from '../src/db/seed.js';

describe('Idempotent Sambel Bledek seed and OpenAPI /docs', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.close();
  });

  beforeEach(async () => {
    await resetDatabase(ctx.db);
  });

  it('seeds realistic Sambel Bledek data idempotently and populates dashboard and reports', async () => {
    const first = await seedDatabase(ctx.db);
    expect(first.seeded).toBe(true);
    expect(first.counts.users).toBe(1);
    expect(first.counts.kategori).toBe(3);
    expect(first.counts.satuan).toBeGreaterThanOrEqual(4);
    expect(first.counts.pemasok).toBe(4);
    expect(first.counts.bahan).toBe(13);
    expect(first.counts.transaksi).toBeGreaterThanOrEqual(10);

    const second = await seedDatabase(ctx.db);
    expect(second.seeded).toBe(false);
    expect(second.counts).toEqual(first.counts);

    const login = await request(ctx.app)
      .post('/api/auth/login')
      .send({ username: 'pemilik', password: 'bledek123' });
    expect(login.status).toBe(200);
    const token = login.body.data.token as string;

    const dash = await request(ctx.app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${token}`);
    expect(dash.status).toBe(200);
    expect(dash.body.data.ringkasan.total_bahan_aktif).toBe(13);
    expect(dash.body.data.ringkasan.stok_menipis).toBeGreaterThanOrEqual(3);
    expect(dash.body.data.ringkasan.barang_masuk_hari_ini).toBeGreaterThanOrEqual(1);
    expect(dash.body.data.ringkasan.barang_keluar_hari_ini).toBeGreaterThanOrEqual(1);

    const report = await request(ctx.app)
      .get('/api/laporan')
      .set('Authorization', `Bearer ${token}`);
    expect(report.status).toBe(200);
    expect(report.body.data.nilai_persediaan.total_nilai).toBeGreaterThan(0);
    expect(report.body.data.pemakaian_bahan.length).toBeGreaterThan(0);
    expect(report.body.data.daftar_belanja.items.length).toBeGreaterThanOrEqual(3);

    const cabaiPrice = report.body.data.ringkasan_harga_bahan.find(
      (item: { nama_bahan: string }) => item.nama_bahan === 'Cabai',
    );
    expect(cabaiPrice).toBeDefined();
    expect(cabaiPrice.harga_terendah).toBe(50000);
    expect(cabaiPrice.harga_tertinggi).toBe(70000);
    expect(cabaiPrice.perbandingan_pemasok.length).toBeGreaterThanOrEqual(2);
  });

  it('serves valid OpenAPI 3.0.3 JSON and Swagger UI HTML at /docs', async () => {
    const specRes = await request(ctx.app).get('/api/openapi.json');
    expect(specRes.status).toBe(200);
    expect(specRes.body.openapi).toBe('3.0.3');
    expect(specRes.body.paths['/api/auth/login']).toBeDefined();
    expect(specRes.body.paths['/api/bahan']).toBeDefined();
    expect(specRes.body.paths['/api/transaksi']).toBeDefined();
    expect(specRes.body.paths['/api/dashboard']).toBeDefined();
    expect(specRes.body.paths['/api/laporan']).toBeDefined();

    const docsRes = await request(ctx.app).get('/docs');
    expect(docsRes.status).toBe(200);
    expect(docsRes.headers['content-type']).toContain('text/html');
    expect(docsRes.text).toContain('/api/openapi.json');
  });
});
