import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createAndLoginOwner, createTestApp, resetDatabase, type TestContext } from './helpers.js';

describe('Multi-item atomic transactions API (/api/transaksi)', () => {
  let ctx: TestContext;
  let token: string;
  let idAyam: number;
  let idCabai: number;
  let idPemasok: number;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.close();
  });

  beforeEach(async () => {
    await resetDatabase(ctx.db);
    token = await createAndLoginOwner(ctx.app, ctx.db);

    const kat = await request(ctx.app)
      .post('/api/kategori')
      .set('Authorization', `Bearer ${token}`)
      .send({ nama_kategori: 'Bahan Utama' });
    const sat = await request(ctx.app)
      .post('/api/satuan')
      .set('Authorization', `Bearer ${token}`)
      .send({ nama_satuan: 'kg' });
    const sup = await request(ctx.app)
      .post('/api/pemasok')
      .set('Authorization', `Bearer ${token}`)
      .send({ nama_pemasok: 'Kios Bu Sari', no_telepon: '081234', alamat: 'Gunungpati' });
    idPemasok = sup.body.data.id_pemasok;

    const b1 = await request(ctx.app)
      .post('/api/bahan')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nama_bahan: 'Ayam',
        id_kategori: kat.body.data.id_kategori,
        id_satuan: sat.body.data.id_satuan,
        stok_minimum: 5,
      });
    idAyam = b1.body.data.id_bahan;

    const b2 = await request(ctx.app)
      .post('/api/bahan')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nama_bahan: 'Cabai',
        id_kategori: kat.body.data.id_kategori,
        id_satuan: sat.body.data.id_satuan,
        stok_minimum: 2,
      });
    idCabai = b2.body.data.id_bahan;
  });

  it('records multi-item masuk, updates stock and harga_terakhir, and blocks deleting referenced pemasok', async () => {
    const res = await request(ctx.app)
      .post('/api/transaksi')
      .set('Authorization', `Bearer ${token}`)
      .send({
        waktu_transaksi: '2026-11-24',
        jenis_transaksi: 'masuk',
        id_pemasok: idPemasok,
        catatan: 'Belanja pagi',
        detail: [
          { id_bahan: idAyam, jumlah: 10, harga_beli_satuan: 38000 },
          { id_bahan: idCabai, jumlah: 0.3, harga_beli_satuan: 70000 },
        ],
      });

    expect(res.status).toBe(201);
    expect(typeof res.body.data.id_transaksi).toBe('string');
    expect(res.body.data.id_transaksi.length).toBeGreaterThanOrEqual(8);
    expect(res.body.data.total_pembelian).toBe(401000);
    expect(res.body.data.detail).toHaveLength(2);

    const ayam = await request(ctx.app)
      .get(`/api/bahan/${idAyam}`)
      .set('Authorization', `Bearer ${token}`);
    expect(ayam.body.data.stok_saat_ini).toBe(10);
    expect(ayam.body.data.harga_terakhir).toBe(38000);
    expect(ayam.body.data.nilai_persediaan).toBe(380000);

    const delPemasok = await request(ctx.app)
      .delete(`/api/pemasok/${idPemasok}`)
      .set('Authorization', `Bearer ${token}`);
    expect(delPemasok.status).toBe(409);
    expect(delPemasok.body.error.code).toBe('IN_USE');
  });

  it('handles decimal keluar accurately and rolls back entire multi-item transaction if one item lacks stock', async () => {
    await request(ctx.app)
      .post('/api/transaksi')
      .set('Authorization', `Bearer ${token}`)
      .send({
        waktu_transaksi: '2026-11-24',
        jenis_transaksi: 'masuk',
        id_pemasok: idPemasok,
        catatan: '',
        detail: [
          { id_bahan: idAyam, jumlah: 10, harga_beli_satuan: 38000 },
          { id_bahan: idCabai, jumlah: 0.3, harga_beli_satuan: 60000 },
        ],
      });

    // Decimal precision: 0.30 - 0.25 must be exact 0.05
    const keluarOk = await request(ctx.app)
      .post('/api/transaksi')
      .set('Authorization', `Bearer ${token}`)
      .send({
        waktu_transaksi: '2026-11-25',
        jenis_transaksi: 'keluar',
        id_pemasok: null,
        catatan: 'Masak sambal batch 1',
        detail: [{ id_bahan: idCabai, jumlah: 0.25, harga_beli_satuan: null }],
      });
    expect(keluarOk.status).toBe(201);

    const cabaiAfter = await request(ctx.app)
      .get(`/api/bahan/${idCabai}`)
      .set('Authorization', `Bearer ${token}`);
    expect(cabaiAfter.body.data.stok_saat_ini).toBe(0.05);

    // Multi-item rollback: Ayam (2 <= 10) ok, Cabai (1 > 0.05) fails -> Ayam must remain 10
    const failMulti = await request(ctx.app)
      .post('/api/transaksi')
      .set('Authorization', `Bearer ${token}`)
      .send({
        waktu_transaksi: '2026-11-25',
        jenis_transaksi: 'keluar',
        id_pemasok: null,
        catatan: 'Harus rollback',
        detail: [
          { id_bahan: idAyam, jumlah: 2, harga_beli_satuan: null },
          { id_bahan: idCabai, jumlah: 1, harga_beli_satuan: null },
        ],
      });
    expect(failMulti.status).toBe(422);
    expect(failMulti.body.error.code).toBe('INSUFFICIENT_STOCK');

    const ayamStillTen = await request(ctx.app)
      .get(`/api/bahan/${idAyam}`)
      .set('Authorization', `Bearer ${token}`);
    expect(ayamStillTen.body.data.stok_saat_ini).toBe(10);
  });

  it('prevents negative stock under concurrent keluar requests', async () => {
    await request(ctx.app)
      .post('/api/transaksi')
      .set('Authorization', `Bearer ${token}`)
      .send({
        waktu_transaksi: '2026-11-24',
        jenis_transaksi: 'masuk',
        id_pemasok: idPemasok,
        catatan: '',
        detail: [{ id_bahan: idAyam, jumlah: 10, harga_beli_satuan: 38000 }],
      });

    const [r1, r2] = await Promise.all([
      request(ctx.app)
        .post('/api/transaksi')
        .set('Authorization', `Bearer ${token}`)
        .send({
          waktu_transaksi: '2026-11-25',
          jenis_transaksi: 'keluar',
          id_pemasok: null,
          catatan: 'Batch A',
          detail: [{ id_bahan: idAyam, jumlah: 6, harga_beli_satuan: null }],
        }),
      request(ctx.app)
        .post('/api/transaksi')
        .set('Authorization', `Bearer ${token}`)
        .send({
          waktu_transaksi: '2026-11-25',
          jenis_transaksi: 'keluar',
          id_pemasok: null,
          catatan: 'Batch B',
          detail: [{ id_bahan: idAyam, jumlah: 6, harga_beli_satuan: null }],
        }),
    ]);

    const statuses = [r1.status, r2.status].sort((a, b) => a - b);
    expect(statuses).toEqual([201, 422]);

    const ayam = await request(ctx.app)
      .get(`/api/bahan/${idAyam}`)
      .set('Authorization', `Bearer ${token}`);
    expect(ayam.body.data.stok_saat_ini).toBe(4);
  });

  it('keeps latest harga_terakhir when a backdated masuk is recorded and recalculates on delete', async () => {
    const newer = await request(ctx.app)
      .post('/api/transaksi')
      .set('Authorization', `Bearer ${token}`)
      .send({
        waktu_transaksi: '2026-11-24',
        jenis_transaksi: 'masuk',
        id_pemasok: idPemasok,
        catatan: 'Harga mahal',
        detail: [{ id_bahan: idCabai, jumlah: 2, harga_beli_satuan: 70000 }],
      });
    expect(newer.status).toBe(201);

    const backdated = await request(ctx.app)
      .post('/api/transaksi')
      .set('Authorization', `Bearer ${token}`)
      .send({
        waktu_transaksi: '2026-11-10',
        jenis_transaksi: 'masuk',
        id_pemasok: idPemasok,
        catatan: 'Nota lama',
        detail: [{ id_bahan: idCabai, jumlah: 3, harga_beli_satuan: 50000 }],
      });
    expect(backdated.status).toBe(201);

    let cabai = await request(ctx.app)
      .get(`/api/bahan/${idCabai}`)
      .set('Authorization', `Bearer ${token}`);
    expect(cabai.body.data.stok_saat_ini).toBe(5);
    expect(cabai.body.data.harga_terakhir).toBe(70000);

    // Delete the newer masuk -> stock drops to 3 and harga_terakhir reverts to 50000
    const delNewer = await request(ctx.app)
      .delete(`/api/transaksi/${newer.body.data.id_transaksi}`)
      .set('Authorization', `Bearer ${token}`);
    expect(delNewer.status).toBe(200);

    cabai = await request(ctx.app)
      .get(`/api/bahan/${idCabai}`)
      .set('Authorization', `Bearer ${token}`);
    expect(cabai.body.data.stok_saat_ini).toBe(3);
    expect(cabai.body.data.harga_terakhir).toBe(50000);

    // Use 2 kg then try deleting the remaining 3 kg masuk -> 409 CONFLICT
    await request(ctx.app)
      .post('/api/transaksi')
      .set('Authorization', `Bearer ${token}`)
      .send({
        waktu_transaksi: '2026-11-25',
        jenis_transaksi: 'keluar',
        id_pemasok: null,
        catatan: 'Pakai 2 kg',
        detail: [{ id_bahan: idCabai, jumlah: 2, harga_beli_satuan: null }],
      });

    const delBlocked = await request(ctx.app)
      .delete(`/api/transaksi/${backdated.body.data.id_transaksi}`)
      .set('Authorization', `Bearer ${token}`);
    expect(delBlocked.status).toBe(409);
    expect(delBlocked.body.error.code).toBe('CONFLICT');
  });

  it('rejects duplicate bahan in detail, inactive bahan, and inverted date range on list', async () => {
    const dupItem = await request(ctx.app)
      .post('/api/transaksi')
      .set('Authorization', `Bearer ${token}`)
      .send({
        waktu_transaksi: '2026-11-25',
        jenis_transaksi: 'masuk',
        id_pemasok: idPemasok,
        catatan: '',
        detail: [
          { id_bahan: idAyam, jumlah: 2, harga_beli_satuan: 38000 },
          { id_bahan: idAyam, jumlah: 3, harga_beli_satuan: 38000 },
        ],
      });
    expect(dupItem.status).toBe(422);

    await request(ctx.app)
      .patch(`/api/bahan/${idAyam}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ aktif: false });

    const inactiveRes = await request(ctx.app)
      .post('/api/transaksi')
      .set('Authorization', `Bearer ${token}`)
      .send({
        waktu_transaksi: '2026-11-25',
        jenis_transaksi: 'masuk',
        id_pemasok: idPemasok,
        catatan: '',
        detail: [{ id_bahan: idAyam, jumlah: 2, harga_beli_satuan: 38000 }],
      });
    expect(inactiveRes.status).toBe(422);
    expect(inactiveRes.body.error.code).toBe('INACTIVE_MATERIAL');

    const badRange = await request(ctx.app)
      .get('/api/transaksi?start_date=2026-11-25&end_date=2026-11-01')
      .set('Authorization', `Bearer ${token}`);
    expect(badRange.status).toBe(422);
  });
});
