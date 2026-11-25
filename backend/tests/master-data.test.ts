import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createAndLoginOwner, createTestApp, resetDatabase, type TestContext } from './helpers.js';

describe('Master data endpoints: kategori, satuan, pemasok, and bahan', () => {
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

  it('requires authentication on all master data endpoints', async () => {
    const [k, s, p, b] = await Promise.all([
      request(ctx.app).get('/api/kategori'),
      request(ctx.app).get('/api/satuan'),
      request(ctx.app).get('/api/pemasok'),
      request(ctx.app).get('/api/bahan'),
    ]);

    expect(k.status).toBe(401);
    expect(s.status).toBe(401);
    expect(p.status).toBe(401);
    expect(b.status).toBe(401);
  });

  it('supports CRUD and case-insensitive uniqueness on /api/kategori and /api/satuan', async () => {
    const createKat = await request(ctx.app)
      .post('/api/kategori')
      .set('Authorization', `Bearer ${token}`)
      .send({ nama_kategori: 'Bahan Utama' });
    expect(createKat.status).toBe(201);
    expect(createKat.body.data).toMatchObject({ id_kategori: 1, nama_kategori: 'Bahan Utama' });

    const dupKat = await request(ctx.app)
      .post('/api/kategori')
      .set('Authorization', `Bearer ${token}`)
      .send({ nama_kategori: 'bahan utama' });
    expect(dupKat.status).toBe(409);

    const patchKat = await request(ctx.app)
      .patch('/api/kategori/1')
      .set('Authorization', `Bearer ${token}`)
      .send({ nama_kategori: 'Bahan Baku Utama' });
    expect(patchKat.status).toBe(200);
    expect(patchKat.body.data.nama_kategori).toBe('Bahan Baku Utama');

    const createSat = await request(ctx.app)
      .post('/api/satuan')
      .set('Authorization', `Bearer ${token}`)
      .send({ nama_satuan: 'kg' });
    expect(createSat.status).toBe(201);
    expect(createSat.body.data).toMatchObject({ id_satuan: 1, nama_satuan: 'kg' });

    const listSat = await request(ctx.app)
      .get('/api/satuan?search=KG')
      .set('Authorization', `Bearer ${token}`);
    expect(listSat.status).toBe(200);
    expect(listSat.body.data).toHaveLength(1);

    const delSat = await request(ctx.app)
      .delete('/api/satuan/1')
      .set('Authorization', `Bearer ${token}`);
    expect(delSat.status).toBe(200);
  });

  it('supports CRUD, search across fields, pagination, and validation on /api/pemasok', async () => {
    const p1 = await request(ctx.app)
      .post('/api/pemasok')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nama_pemasok: 'Toko Sembako Pak Budi',
        no_telepon: '08123456789',
        alamat: 'Kalisegoro, Gunungpati',
      });
    expect(p1.status).toBe(201);

    const p2 = await request(ctx.app)
      .post('/api/pemasok')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nama_pemasok: 'Agen Ayam Segar',
        no_telepon: '08567891234',
        alamat: 'Pasar Gunungpati',
      });
    expect(p2.status).toBe(201);

    const dup = await request(ctx.app)
      .post('/api/pemasok')
      .set('Authorization', `Bearer ${token}`)
      .send({ nama_pemasok: 'agen ayam segar' });
    expect(dup.status).toBe(409);

    const searchByPhone = await request(ctx.app)
      .get('/api/pemasok?search=08567')
      .set('Authorization', `Bearer ${token}`);
    expect(searchByPhone.status).toBe(200);
    expect(searchByPhone.body.data).toHaveLength(1);
    expect(searchByPhone.body.data[0].nama_pemasok).toBe('Agen Ayam Segar');

    const paginated = await request(ctx.app)
      .get('/api/pemasok?page=1&page_size=1')
      .set('Authorization', `Bearer ${token}`);
    expect(paginated.status).toBe(200);
    expect(paginated.body.data).toHaveLength(1);
    expect(paginated.body.pagination).toEqual({
      page: 1,
      page_size: 1,
      total_items: 2,
      total_pages: 2,
    });

    const badId = await request(ctx.app)
      .get('/api/pemasok/abc')
      .set('Authorization', `Bearer ${token}`);
    expect(badId.status).toBe(400);
    expect(badId.body.error.code).toBe('INVALID_ID');
  });

  it('supports CRUD, active toggle, filters, stock status, and blocks deleting referenced kategori/satuan', async () => {
    const kat = await request(ctx.app)
      .post('/api/kategori')
      .set('Authorization', `Bearer ${token}`)
      .send({ nama_kategori: 'Bahan Utama' });
    const sat = await request(ctx.app)
      .post('/api/satuan')
      .set('Authorization', `Bearer ${token}`)
      .send({ nama_satuan: 'kg' });

    const createBahan = await request(ctx.app)
      .post('/api/bahan')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nama_bahan: 'Ayam',
        id_kategori: kat.body.data.id_kategori,
        id_satuan: sat.body.data.id_satuan,
        stok_minimum: 5,
      });

    expect(createBahan.status).toBe(201);
    expect(createBahan.body.data).toMatchObject({
      id_bahan: 1,
      nama_bahan: 'Ayam',
      id_kategori: 1,
      nama_kategori: 'Bahan Utama',
      id_satuan: 1,
      nama_satuan: 'kg',
      stok_saat_ini: 0,
      stok_minimum: 5,
      harga_terakhir: 0,
      nilai_persediaan: 0,
      status: 'habis',
      aktif: true,
    });

    const delUsedKat = await request(ctx.app)
      .delete('/api/kategori/1')
      .set('Authorization', `Bearer ${token}`);
    expect(delUsedKat.status).toBe(409);
    expect(delUsedKat.body.error.code).toBe('IN_USE');

    const delUsedSat = await request(ctx.app)
      .delete('/api/satuan/1')
      .set('Authorization', `Bearer ${token}`);
    expect(delUsedSat.status).toBe(409);
    expect(delUsedSat.body.error.code).toBe('IN_USE');

    const toggleOff = await request(ctx.app)
      .patch('/api/bahan/1')
      .set('Authorization', `Bearer ${token}`)
      .send({ aktif: false, stok_minimum: 3 });
    expect(toggleOff.status).toBe(200);
    expect(toggleOff.body.data.aktif).toBe(false);
    expect(toggleOff.body.data.stok_minimum).toBe(3);

    const onlyActive = await request(ctx.app)
      .get('/api/bahan?aktif=true')
      .set('Authorization', `Bearer ${token}`);
    expect(onlyActive.status).toBe(200);
    expect(onlyActive.body.data).toHaveLength(0);

    const invalidPagination = await request(ctx.app)
      .get('/api/bahan?page=0&page_size=500')
      .set('Authorization', `Bearer ${token}`);
    expect(invalidPagination.status).toBe(422);
    expect(invalidPagination.body.error.code).toBe('VALIDATION_ERROR');
  });
});
