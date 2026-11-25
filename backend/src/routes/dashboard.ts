import { desc, eq, sql } from 'drizzle-orm';
import { Router } from 'express';
import type { AppDb } from '../db/client.js';
import { bahan, detailTransaksi, pemasok, satuan, transaksi } from '../db/schema.js';
import { toNumber } from '../lib/numbers.js';
import { computeStockStatus } from '../lib/stock.js';
import { isPreWeekendWib, todayWib } from '../lib/time.js';

export function createDashboardRouter(db: AppDb): Router {
  const router = Router();

  router.get('/', async (_req, res) => {
    const tanggalWib = todayWib();
    const preWeekend = isPreWeekendWib();

    const activeMaterials = await db
      .select({
        id_bahan: bahan.id_bahan,
        nama_bahan: bahan.nama_bahan,
        satuan: satuan.nama_satuan,
        stok_saat_ini: bahan.stok_saat_ini,
        stok_minimum: bahan.stok_minimum,
      })
      .from(bahan)
      .innerJoin(satuan, eq(bahan.id_satuan, satuan.id_satuan))
      .where(eq(bahan.aktif, true));

    let stokHabis = 0;
    const lowStockItems: Array<{
      id_bahan: number;
      nama_bahan: string;
      satuan: string;
      stok_saat_ini: number;
      stok_minimum: number;
      status: 'habis' | 'menipis';
      ratio: number;
    }> = [];

    for (const row of activeMaterials) {
      const current = toNumber(row.stok_saat_ini);
      const minimum = toNumber(row.stok_minimum);
      const status = computeStockStatus(current, minimum);

      if (status === 'habis') {
        stokHabis += 1;
        lowStockItems.push({
          id_bahan: row.id_bahan,
          nama_bahan: row.nama_bahan,
          satuan: row.satuan,
          stok_saat_ini: current,
          stok_minimum: minimum,
          status: 'habis',
          ratio: -1,
        });
      } else if (status === 'menipis') {
        lowStockItems.push({
          id_bahan: row.id_bahan,
          nama_bahan: row.nama_bahan,
          satuan: row.satuan,
          stok_saat_ini: current,
          stok_minimum: minimum,
          status: 'menipis',
          ratio: minimum > 0 ? current / minimum : 1,
        });
      }
    }

    lowStockItems.sort((a, b) => a.ratio - b.ratio || a.nama_bahan.localeCompare(b.nama_bahan));

    const todayCounts = await db
      .select({
        jenis_transaksi: transaksi.jenis_transaksi,
        total: sql<number>`count(*)::int`,
      })
      .from(transaksi)
      .where(eq(transaksi.waktu_transaksi, tanggalWib))
      .groupBy(transaksi.jenis_transaksi);

    let barangMasukHariIni = 0;
    let barangKeluarHariIni = 0;
    for (const row of todayCounts) {
      if (row.jenis_transaksi === 'masuk') barangMasukHariIni = Number(row.total);
      if (row.jenis_transaksi === 'keluar') barangKeluarHariIni = Number(row.total);
    }

    const recentRows = await db
      .select({
        id_transaksi: transaksi.id_transaksi,
        waktu_transaksi: transaksi.waktu_transaksi,
        jenis_transaksi: transaksi.jenis_transaksi,
        catatan: transaksi.catatan,
        nama_pemasok: pemasok.nama_pemasok,
        jumlah_jenis_bahan: sql<number>`count(${detailTransaksi.id_detail})::int`,
        total_pembelian: sql<number>`coalesce(sum(round(${detailTransaksi.jumlah} * coalesce(${detailTransaksi.harga_beli_satuan}, 0))), 0)::int`,
      })
      .from(transaksi)
      .leftJoin(pemasok, eq(transaksi.id_pemasok, pemasok.id_pemasok))
      .leftJoin(detailTransaksi, eq(transaksi.id_transaksi, detailTransaksi.id_transaksi))
      .groupBy(transaksi.id_transaksi, pemasok.nama_pemasok)
      .orderBy(desc(transaksi.waktu_transaksi), desc(transaksi.created_at))
      .limit(5);

    res.json({
      data: {
        tanggal_wib: tanggalWib,
        is_pre_weekend: preWeekend,
        ringkasan: {
          total_bahan_aktif: activeMaterials.length,
          stok_menipis: lowStockItems.length,
          stok_habis: stokHabis,
          barang_masuk_hari_ini: barangMasukHariIni,
          barang_keluar_hari_ini: barangKeluarHariIni,
        },
        stok_menipis: lowStockItems.map(({ ratio: _ratio, ...item }) => item),
        transaksi_terbaru: recentRows.map((row) => ({
          id_transaksi: row.id_transaksi,
          waktu_transaksi: row.waktu_transaksi,
          jenis_transaksi: row.jenis_transaksi,
          catatan: row.catatan,
          nama_pemasok: row.nama_pemasok,
          jumlah_jenis_bahan: Number(row.jumlah_jenis_bahan),
          total_pembelian: row.jenis_transaksi === 'masuk' ? Number(row.total_pembelian) : 0,
        })),
      },
    });
  });

  return router;
}
