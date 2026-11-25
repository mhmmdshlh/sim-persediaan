import { and, asc, desc, eq, gte, lte, type SQL } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import type { AppDb } from '../db/client.js';
import { bahan, detailTransaksi, kategori, pemasok, satuan, transaksi } from '../db/schema.js';
import { AppError } from '../lib/errors.js';
import { roundQty, toNumber } from '../lib/numbers.js';
import { isPreWeekendWib } from '../lib/time.js';
import { isoDateSchema, MAX_INT4 } from '../lib/validation.js';

function isValidCalendarDate(dateStr: string): boolean {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

const calendarDateSchema = isoDateSchema.refine(isValidCalendarDate, {
  message: 'Tanggal kalender tidak valid.',
});

const laporanQuerySchema = z.object({
  start_date: calendarDateSchema.optional(),
  end_date: calendarDateSchema.optional(),
  id_bahan: z.coerce.number().int().min(1).max(MAX_INT4).optional(),
  weekend_mode: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

export function createLaporanRouter(db: AppDb): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    const query = laporanQuerySchema.parse(req.query);
    if (query.start_date && query.end_date && query.start_date > query.end_date) {
      throw new AppError(
        422,
        'VALIDATION_ERROR',
        'Tanggal mulai tidak boleh lebih besar dari tanggal akhir.',
      );
    }

    const weekendMode = query.weekend_mode ?? isPreWeekendWib();
    const txConditions: SQL[] = [];
    if (query.start_date) txConditions.push(gte(transaksi.waktu_transaksi, query.start_date));
    if (query.end_date) txConditions.push(lte(transaksi.waktu_transaksi, query.end_date));
    const txWhere = txConditions.length > 0 ? and(...txConditions) : undefined;

    const periodTransactions = await db
      .select({
        id_transaksi: transaksi.id_transaksi,
        jenis_transaksi: transaksi.jenis_transaksi,
      })
      .from(transaksi)
      .where(txWhere);

    let totalTransaksiMasuk = 0;
    let totalTransaksiKeluar = 0;
    for (const tx of periodTransactions) {
      if (tx.jenis_transaksi === 'masuk') totalTransaksiMasuk += 1;
      if (tx.jenis_transaksi === 'keluar') totalTransaksiKeluar += 1;
    }

    const detailRows = await db
      .select({
        id_detail: detailTransaksi.id_detail,
        id_transaksi: transaksi.id_transaksi,
        waktu_transaksi: transaksi.waktu_transaksi,
        created_at: transaksi.created_at,
        jenis_transaksi: transaksi.jenis_transaksi,
        id_pemasok: transaksi.id_pemasok,
        nama_pemasok: pemasok.nama_pemasok,
        id_bahan: detailTransaksi.id_bahan,
        nama_bahan: bahan.nama_bahan,
        satuan: satuan.nama_satuan,
        jumlah: detailTransaksi.jumlah,
        harga_beli_satuan: detailTransaksi.harga_beli_satuan,
        harga_snapshot: detailTransaksi.harga_snapshot,
      })
      .from(detailTransaksi)
      .innerJoin(transaksi, eq(detailTransaksi.id_transaksi, transaksi.id_transaksi))
      .innerJoin(bahan, eq(detailTransaksi.id_bahan, bahan.id_bahan))
      .innerJoin(satuan, eq(bahan.id_satuan, satuan.id_satuan))
      .leftJoin(pemasok, eq(transaksi.id_pemasok, pemasok.id_pemasok))
      .where(txWhere)
      .orderBy(desc(transaksi.waktu_transaksi), desc(transaksi.created_at), desc(detailTransaksi.id_detail));

    const usageMap = new Map<
      number,
      {
        id_bahan: number;
        nama_bahan: string;
        satuan: string;
        total_jumlah: number;
        jumlah_transaksi: number;
        estimasi_biaya: number;
      }
    >();

    let totalPengeluaranPembelian = 0;
    let totalEstimasiPemakaian = 0;

    const riwayatHarga: Array<{
      id: string;
      tanggal: string;
      id_bahan: number;
      nama_bahan: string;
      id_pemasok: number | null;
      nama_pemasok: string | null;
      jumlah: number;
      satuan: string;
      harga_beli_satuan: number;
      subtotal: number;
    }> = [];

    const priceSummaryMap = new Map<
      number,
      {
        id_bahan: number;
        nama_bahan: string;
        satuan: string;
        prices: number[];
        latestPrice: number;
        suppliers: Map<
          number,
          {
            id_pemasok: number;
            nama_pemasok: string;
            prices: number[];
            latestPrice: number;
          }
        >;
      }
    >();

    for (const row of detailRows) {
      const jumlah = toNumber(row.jumlah);

      if (row.jenis_transaksi === 'keluar') {
        const biaya = Math.round(jumlah * row.harga_snapshot);
        totalEstimasiPemakaian += biaya;

        const existing = usageMap.get(row.id_bahan);
        if (existing) {
          existing.total_jumlah = roundQty(existing.total_jumlah + jumlah);
          existing.jumlah_transaksi += 1;
          existing.estimasi_biaya += biaya;
        } else {
          usageMap.set(row.id_bahan, {
            id_bahan: row.id_bahan,
            nama_bahan: row.nama_bahan,
            satuan: row.satuan,
            total_jumlah: jumlah,
            jumlah_transaksi: 1,
            estimasi_biaya: biaya,
          });
        }
      } else if (row.harga_beli_satuan !== null) {
        const subtotal = Math.round(jumlah * row.harga_beli_satuan);
        totalPengeluaranPembelian += subtotal;

        if (query.id_bahan !== undefined && row.id_bahan !== query.id_bahan) {
          continue;
        }

        riwayatHarga.push({
          id: `${row.id_transaksi}-${row.id_bahan}`,
          tanggal: row.waktu_transaksi,
          id_bahan: row.id_bahan,
          nama_bahan: row.nama_bahan,
          id_pemasok: row.id_pemasok,
          nama_pemasok: row.nama_pemasok,
          jumlah,
          satuan: row.satuan,
          harga_beli_satuan: row.harga_beli_satuan,
          subtotal,
        });

        let summary = priceSummaryMap.get(row.id_bahan);
        if (!summary) {
          summary = {
            id_bahan: row.id_bahan,
            nama_bahan: row.nama_bahan,
            satuan: row.satuan,
            prices: [],
            // Rows are ordered newest-first, so the first price seen is the latest.
            latestPrice: row.harga_beli_satuan,
            suppliers: new Map(),
          };
          priceSummaryMap.set(row.id_bahan, summary);
        }
        summary.prices.push(row.harga_beli_satuan);

        if (row.id_pemasok !== null && row.nama_pemasok) {
          let sup = summary.suppliers.get(row.id_pemasok);
          if (!sup) {
            sup = {
              id_pemasok: row.id_pemasok,
              nama_pemasok: row.nama_pemasok,
              prices: [],
              latestPrice: row.harga_beli_satuan,
            };
            summary.suppliers.set(row.id_pemasok, sup);
          }
          sup.prices.push(row.harga_beli_satuan);
        }
      }
    }

    const pemakaianBahan = Array.from(usageMap.values()).sort(
      (a, b) => b.estimasi_biaya - a.estimasi_biaya || b.total_jumlah - a.total_jumlah,
    );

    const ringkasanHargaBahan = Array.from(priceSummaryMap.values()).map((entry) => {
      const avg = Math.round(entry.prices.reduce((s, p) => s + p, 0) / entry.prices.length);
      return {
        id_bahan: entry.id_bahan,
        nama_bahan: entry.nama_bahan,
        satuan: entry.satuan,
        harga_terendah: Math.min(...entry.prices),
        harga_tertinggi: Math.max(...entry.prices),
        harga_rata_rata: avg,
        harga_terakhir: entry.latestPrice,
        jumlah_pembelian: entry.prices.length,
        perbandingan_pemasok: Array.from(entry.suppliers.values())
          .map((sup) => ({
            id_pemasok: sup.id_pemasok,
            nama_pemasok: sup.nama_pemasok,
            harga_rata_rata: Math.round(sup.prices.reduce((s, p) => s + p, 0) / sup.prices.length),
            harga_terendah: Math.min(...sup.prices),
            harga_tertinggi: Math.max(...sup.prices),
            harga_terakhir: sup.latestPrice,
            jumlah_transaksi: sup.prices.length,
          }))
          .sort((a, b) => a.harga_rata_rata - b.harga_rata_rata),
      };
    });

    const activeMaterials = await db
      .select({
        id_bahan: bahan.id_bahan,
        nama_bahan: bahan.nama_bahan,
        id_kategori: bahan.id_kategori,
        nama_kategori: kategori.nama_kategori,
        satuan: satuan.nama_satuan,
        stok_saat_ini: bahan.stok_saat_ini,
        stok_minimum: bahan.stok_minimum,
        harga_terakhir: bahan.harga_terakhir,
      })
      .from(bahan)
      .innerJoin(kategori, eq(bahan.id_kategori, kategori.id_kategori))
      .innerJoin(satuan, eq(bahan.id_satuan, satuan.id_satuan))
      .where(eq(bahan.aktif, true))
      .orderBy(asc(bahan.nama_bahan));

    const kategoriTotals = new Map<
      number,
      { id_kategori: number; nama_kategori: string; total_nilai: number; jumlah_bahan: number }
    >();
    let totalNilaiPersediaan = 0;

    const valuationItems = activeMaterials.map((item) => {
      const stok = toNumber(item.stok_saat_ini);
      const nilai = Math.round(stok * item.harga_terakhir);
      totalNilaiPersediaan += nilai;

      const kat = kategoriTotals.get(item.id_kategori);
      if (kat) {
        kat.total_nilai += nilai;
        kat.jumlah_bahan += 1;
      } else {
        kategoriTotals.set(item.id_kategori, {
          id_kategori: item.id_kategori,
          nama_kategori: item.nama_kategori,
          total_nilai: nilai,
          jumlah_bahan: 1,
        });
      }

      return {
        id_bahan: item.id_bahan,
        nama_bahan: item.nama_bahan,
        nama_kategori: item.nama_kategori,
        satuan: item.satuan,
        stok_saat_ini: stok,
        harga_terakhir: item.harga_terakhir,
        nilai_persediaan: nilai,
      };
    });

    // Find the most recent supplier per material across all historical purchases for shopping suggestions.
    const latestPurchases = await db
      .select({
        id_bahan: detailTransaksi.id_bahan,
        id_pemasok: pemasok.id_pemasok,
        nama_pemasok: pemasok.nama_pemasok,
        no_telepon: pemasok.no_telepon,
      })
      .from(detailTransaksi)
      .innerJoin(transaksi, eq(detailTransaksi.id_transaksi, transaksi.id_transaksi))
      .innerJoin(pemasok, eq(transaksi.id_pemasok, pemasok.id_pemasok))
      .where(eq(transaksi.jenis_transaksi, 'masuk'))
      .orderBy(desc(transaksi.waktu_transaksi), desc(transaksi.created_at), desc(detailTransaksi.id_detail));

    const lastSupplierByMaterial = new Map<
      number,
      { id_pemasok: number; nama_pemasok: string; no_telepon: string }
    >();
    for (const row of latestPurchases) {
      if (!lastSupplierByMaterial.has(row.id_bahan)) {
        lastSupplierByMaterial.set(row.id_bahan, {
          id_pemasok: row.id_pemasok,
          nama_pemasok: row.nama_pemasok,
          no_telepon: row.no_telepon,
        });
      }
    }

    const thresholdMultiplier = weekendMode ? 1.5 : 1;
    const targetMultiplier = weekendMode ? 2.5 : 2;
    let estimasiTotalBelanja = 0;

    const shoppingItems = activeMaterials
      .filter((item) => {
        const min = toNumber(item.stok_minimum);
        const current = toNumber(item.stok_saat_ini);
        return min > 0 && current <= roundQty(min * thresholdMultiplier);
      })
      .map((item) => {
        const current = toNumber(item.stok_saat_ini);
        const min = toNumber(item.stok_minimum);
        const suggestedQty = roundQty(Math.max(min * targetMultiplier - current, min));
        const estimasiBiaya = Math.round(suggestedQty * item.harga_terakhir);
        estimasiTotalBelanja += estimasiBiaya;

        return {
          id_bahan: item.id_bahan,
          nama_bahan: item.nama_bahan,
          satuan: item.satuan,
          stok_saat_ini: current,
          stok_minimum: min,
          saran_jumlah_beli: suggestedQty,
          harga_terakhir: item.harga_terakhir,
          estimasi_biaya: estimasiBiaya,
          pemasok_terakhir: lastSupplierByMaterial.get(item.id_bahan) ?? null,
        };
      });

    res.json({
      data: {
        periode: {
          start_date: query.start_date ?? null,
          end_date: query.end_date ?? null,
        },
        ringkasan: {
          total_transaksi_masuk: totalTransaksiMasuk,
          total_transaksi_keluar: totalTransaksiKeluar,
          jenis_bahan_digunakan: pemakaianBahan.length,
          total_pengeluaran_pembelian: totalPengeluaranPembelian,
          total_estimasi_pemakaian: totalEstimasiPemakaian,
          total_nilai_persediaan: totalNilaiPersediaan,
        },
        pemakaian_bahan: pemakaianBahan,
        riwayat_harga: riwayatHarga,
        ringkasan_harga_bahan: ringkasanHargaBahan,
        nilai_persediaan: {
          metode_penilaian: 'HARGA_BELI_TERAKHIR',
          keterangan:
            'Nilai persediaan dihitung dari stok saat ini dikalikan harga beli terakhir masing-masing bahan.',
          total_nilai: totalNilaiPersediaan,
          per_kategori: Array.from(kategoriTotals.values()),
          items: valuationItems,
        },
        daftar_belanja: {
          weekend_mode: weekendMode,
          alasan: weekendMode
            ? 'Mode persiapan akhir pekan aktif (buffer 1,5x stok minimum) karena pemasok tutup pada hari Minggu.'
            : 'Daftar bahan aktif yang berada pada atau di bawah batas stok minimum.',
          estimasi_total_biaya: estimasiTotalBelanja,
          items: shoppingItems,
        },
      },
    });
  });

  return router;
}
