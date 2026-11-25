import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createAndLoginOwner, createTestApp, resetDatabase, type TestContext } from './helpers.js';
import { todayWib } from '../src/lib/time.js';

describe('Operational dashboard (/api/dashboard) and MIS reports (/api/laporan)', () => {
  let ctx: TestContext;
  let token: string;
  let idAyam: number;
  let idCabai: number;
  let idMinyak: number;
  let idPemasokA: number;
  let idPemasokB: number;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.close();
  });

  beforeEach(async () => {
    await resetDatabase(ctx.db);
    token = await createAndLoginOwner(ctx.app, ctx.db);

    const kUtama = (
      await request(ctx.app)
        .post('/api/kategori')
        .set('Authorization', `Bearer ${token}`)
        .send({ nama_kategori: 'Bahan Utama' })
    ).body.data.id_kategori;
    const kBumbu = (
      await request(ctx.app)
        .post('/api/kategori')
        .set('Authorization', `Bearer ${token}`)
        .send({ nama_kategori: 'Bumbu' })
    ).body.data.id_kategori;
    const sKg = (
      await request(ctx.app)
        .post('/api/satuan')
        .set('Authorization', `Bearer ${token}`)
        .send({ nama_satuan: 'kg' })
    ).body.data.id_satuan;
    const sLiter = (
      await request(ctx.app)
        .post('/api/satuan')
        .set('Authorization', `Bearer ${token}`)
        .send({ nama_satuan: 'liter' })
    ).body.data.id_satuan;

    idPemasokA = (
      await request(ctx.app)
        .post('/api/pemasok')
        .set('Authorization', `Bearer ${token}`)
        .send({ nama_pemasok: 'Kios Bu Sari', no_telepon: '081111', alamat: 'Gunungpati' })
    ).body.data.id_pemasok;
    idPemasokB = (
      await request(ctx.app)
        .post('/api/pemasok')
        .set('Authorization', `Bearer ${token}`)
        .send({ nama_pemasok: 'Toko Pak Budi', no_telepon: '082222', alamat: 'Kalisegoro' })
    ).body.data.id_pemasok;

    idAyam = (
      await request(ctx.app)
        .post('/api/bahan')
        .set('Authorization', `Bearer ${token}`)
        .send({ nama_bahan: 'Ayam', id_kategori: kUtama, id_satuan: sKg, stok_minimum: 5 })
    ).body.data.id_bahan;
    idCabai = (
      await request(ctx.app)
        .post('/api/bahan')
        .set('Authorization', `Bearer ${token}`)
        .send({ nama_bahan: 'Cabai', id_kategori: kBumbu, id_satuan: sKg, stok_minimum: 2 })
    ).body.data.id_bahan;
    idMinyak = (
      await request(ctx.app)
        .post('/api/bahan')
        .set('Authorization', `Bearer ${token}`)
        .send({ nama_bahan: 'Minyak Goreng', id_kategori: kUtama, id_satuan: sLiter, stok_minimum: 4 })
    ).body.data.id_bahan;

    const today = todayWib();

    // Purchase 1 (older, cheaper cabai from Pemasok A)
    await request(ctx.app)
      .post('/api/transaksi')
      .set('Authorization', `Bearer ${token}`)
      .send({
        waktu_transaksi: '2026-11-10',
        jenis_transaksi: 'masuk',
        id_pemasok: idPemasokA,
        catatan: 'Belanja cabai murah',
        detail: [
          { id_bahan: idCabai, jumlah: 2, harga_beli_satuan: 50000 },
          { id_bahan: idMinyak, jumlah: 10, harga_beli_satuan: 18000 },
        ],
      });

    // Purchase 2 (today, higher cabai from Pemasok B + ayam below minimum)
    await request(ctx.app)
      .post('/api/transaksi')
      .set('Authorization', `Bearer ${token}`)
      .send({
        waktu_transaksi: today,
        jenis_transaksi: 'masuk',
        id_pemasok: idPemasokB,
        catatan: 'Belanja harian',
        detail: [
          { id_bahan: idAyam, jumlah: 3, harga_beli_satuan: 38000 },
          { id_bahan: idCabai, jumlah: 1, harga_beli_satuan: 70000 },
        ],
      });

    // Usage today: use all cabai (3 kg -> 0 habis!) and 5 liter minyak (5 liter -> aman > 4, but within 1.5x weekend buffer 6!)
    await request(ctx.app)
      .post('/api/transaksi')
      .set('Authorization', `Bearer ${token}`)
      .send({
        waktu_transaksi: today,
        jenis_transaksi: 'keluar',
        id_pemasok: null,
        catatan: 'Produksi siang',
        detail: [
          { id_bahan: idCabai, jumlah: 3, harga_beli_satuan: null },
          { id_bahan: idMinyak, jumlah: 5, harga_beli_satuan: null },
        ],
      });
  });

  it('returns daily summary, prioritized low-stock alerts, and recent transactions on GET /api/dashboard', async () => {
    const res = await request(ctx.app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.ringkasan).toEqual({
      total_bahan_aktif: 3,
      stok_menipis: 2,
      stok_habis: 1,
      barang_masuk_hari_ini: 1,
      barang_keluar_hari_ini: 1,
    });

    // Cabai (habis: 0) must sort ahead of Ayam (menipis: 3/5)
    expect(res.body.data.stok_menipis.map((i: { nama_bahan: string }) => i.nama_bahan)).toEqual([
      'Cabai',
      'Ayam',
    ]);
    expect(res.body.data.stok_menipis[0].status).toBe('habis');
    expect(res.body.data.stok_menipis[1].status).toBe('menipis');
    expect(res.body.data.transaksi_terbaru).toHaveLength(3);
  });

  it('returns usage, price history, supplier comparison, inventory valuation, and weekend shopping list on GET /api/laporan', async () => {
    // Deactivate Minyak Goreng after usage to verify historical usage still includes it without crashing
    const resNormal = await request(ctx.app)
      .get('/api/laporan?weekend_mode=false')
      .set('Authorization', `Bearer ${token}`);

    expect(resNormal.status).toBe(200);
    const data = resNormal.body.data;

    expect(data.ringkasan.total_transaksi_masuk).toBe(2);
    expect(data.ringkasan.total_transaksi_keluar).toBe(1);
    expect(data.ringkasan.jenis_bahan_digunakan).toBe(2);
    expect(data.ringkasan.total_pengeluaran_pembelian).toBe(464000);

    // Valuation: Ayam 3*38000=114000 + Cabai 0*70000=0 + Minyak 5*18000=90000 = 204000
    expect(data.nilai_persediaan.metode_penilaian).toBe('HARGA_BELI_TERAKHIR');
    expect(data.nilai_persediaan.total_nilai).toBe(204000);

    // Price summary & supplier comparison for Cabai
    const cabaiPrice = data.ringkasan_harga_bahan.find(
      (item: { id_bahan: number }) => item.id_bahan === idCabai,
    );
    expect(cabaiPrice).toMatchObject({
      harga_terendah: 50000,
      harga_tertinggi: 70000,
      harga_terakhir: 70000,
      jumlah_pembelian: 2,
    });
    expect(cabaiPrice.perbandingan_pemasok).toHaveLength(2);

    // Normal shopping list includes Cabai (0 <= 2) and Ayam (3 <= 5), NOT Minyak (5 > 4)
    expect(
      data.daftar_belanja.items.map((item: { nama_bahan: string }) => item.nama_bahan).sort(),
    ).toEqual(['Ayam', 'Cabai']);
    const ayamBuy = data.daftar_belanja.items.find(
      (item: { id_bahan: number }) => item.id_bahan === idAyam,
    );
    expect(ayamBuy.pemasok_terakhir.nama_pemasok).toBe('Toko Pak Budi');

    // Weekend mode includes Minyak too (5 <= 4 * 1.5 = 6)
    const resWeekend = await request(ctx.app)
      .get('/api/laporan?weekend_mode=true')
      .set('Authorization', `Bearer ${token}`);
    expect(resWeekend.status).toBe(200);
    expect(resWeekend.body.data.daftar_belanja.weekend_mode).toBe(true);
    expect(
      resWeekend.body.data.daftar_belanja.items
        .map((item: { nama_bahan: string }) => item.nama_bahan)
        .sort(),
    ).toEqual(['Ayam', 'Cabai', 'Minyak Goreng']);
  });

  it('retains historical usage after a material is deactivated and rejects inverted date filters', async () => {
    await request(ctx.app)
      .patch(`/api/bahan/${idMinyak}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ aktif: false });

    const res = await request(ctx.app)
      .get('/api/laporan')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const minyakUsage = res.body.data.pemakaian_bahan.find(
      (u: { id_bahan: number }) => u.id_bahan === idMinyak,
    );
    expect(minyakUsage).toBeDefined();
    expect(minyakUsage.total_jumlah).toBe(5);

    const badDates = await request(ctx.app)
      .get('/api/laporan?start_date=2026-11-30&end_date=2026-11-01')
      .set('Authorization', `Bearer ${token}`);
    expect(badDates.status).toBe(422);
  });
});
