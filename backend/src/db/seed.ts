import 'dotenv/config';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { count, eq } from 'drizzle-orm';
import { bootstrapSchema } from './bootstrap.js';
import { createDbClient, type AppDb } from './client.js';
import {
  bahan,
  detailTransaksi,
  kategori,
  pemasok,
  satuan,
  transaksi,
  users,
} from './schema.js';
import { parseEnv } from '../config/env.js';
import { roundQty } from '../lib/numbers.js';
import { hashPassword } from '../lib/password.js';
import { addDaysWib } from '../lib/time.js';

export interface SeedResult {
  seeded: boolean;
  counts: {
    users: number;
    kategori: number;
    satuan: number;
    pemasok: number;
    bahan: number;
    transaksi: number;
  };
}

async function getCounts(db: AppDb): Promise<SeedResult['counts']> {
  const [[u], [k], [s], [p], [b], [t]] = await Promise.all([
    db.select({ total: count() }).from(users),
    db.select({ total: count() }).from(kategori),
    db.select({ total: count() }).from(satuan),
    db.select({ total: count() }).from(pemasok),
    db.select({ total: count() }).from(bahan),
    db.select({ total: count() }).from(transaksi),
  ]);
  return {
    users: Number(u?.total ?? 0),
    kategori: Number(k?.total ?? 0),
    satuan: Number(s?.total ?? 0),
    pemasok: Number(p?.total ?? 0),
    bahan: Number(b?.total ?? 0),
    transaksi: Number(t?.total ?? 0),
  };
}

export async function seedDatabase(db: AppDb): Promise<SeedResult> {
  const existing = await db
    .select({ id_user: users.id_user })
    .from(users)
    .where(eq(users.username, 'pemilik'))
    .limit(1);

  if (existing.length > 0) {
    return { seeded: false, counts: await getCounts(db) };
  }

  const ownerPassword = process.env.SEED_OWNER_PASSWORD || 'bledek123';
  const passwordHash = await hashPassword(ownerPassword);

  await db.transaction(async (tx) => {
    const [owner] = await tx
      .insert(users)
      .values({
        username: 'pemilik',
        nama: 'Ramadhono Wahyu Nugroho',
        password_hash: passwordHash,
        aktif: true,
      })
      .returning({ id_user: users.id_user });

    const insertedKategori = await tx
      .insert(kategori)
      .values([
        { nama_kategori: 'Bahan Utama' },
        { nama_kategori: 'Bumbu' },
        { nama_kategori: 'Bahan Kemasan' },
      ])
      .returning({ id_kategori: kategori.id_kategori, nama_kategori: kategori.nama_kategori });
    const katId = new Map(insertedKategori.map((row) => [row.nama_kategori, row.id_kategori]));

    const insertedSatuan = await tx
      .insert(satuan)
      .values([
        { nama_satuan: 'kg' },
        { nama_satuan: 'gram' },
        { nama_satuan: 'liter' },
        { nama_satuan: 'buah' },
        { nama_satuan: 'botol' },
        { nama_satuan: 'ikat' },
      ])
      .returning({ id_satuan: satuan.id_satuan, nama_satuan: satuan.nama_satuan });
    const satId = new Map(insertedSatuan.map((row) => [row.nama_satuan, row.id_satuan]));

    const insertedPemasok = await tx
      .insert(pemasok)
      .values([
        {
          nama_pemasok: 'Agen Ayam Segar Gunungpati',
          no_telepon: '081220001101',
          alamat: 'Jl. Raya Gunungpati No. 18, Semarang',
        },
        {
          nama_pemasok: 'Toko Sembako Pak Budi',
          no_telepon: '081220001102',
          alamat: 'Ruko Kalisegoro No. 5, Gunungpati, Semarang',
        },
        {
          nama_pemasok: 'Kios Sayur & Cabai Bu Sari',
          no_telepon: '081220001103',
          alamat: 'Pasar Gunungpati Blok B2, Semarang',
        },
        {
          nama_pemasok: 'Toko Kemasan Kalisegoro',
          no_telepon: '081220001104',
          alamat: 'Jl. Kalisegoro Raya No. 22, Semarang',
        },
      ])
      .returning({ id_pemasok: pemasok.id_pemasok, nama_pemasok: pemasok.nama_pemasok });
    const supId = new Map(insertedPemasok.map((row) => [row.nama_pemasok, row.id_pemasok]));

    const materialSeeds = [
      { nama: 'Ayam', kategori: 'Bahan Utama', satuan: 'kg', min: 5 },
      { nama: 'Telur', kategori: 'Bahan Utama', satuan: 'kg', min: 3 },
      { nama: 'Cabai', kategori: 'Bumbu', satuan: 'kg', min: 2 },
      { nama: 'Minyak Goreng', kategori: 'Bahan Utama', satuan: 'liter', min: 4 },
      { nama: 'Sayur Lalapan', kategori: 'Bahan Utama', satuan: 'ikat', min: 5 },
      { nama: 'Bawang Putih', kategori: 'Bumbu', satuan: 'kg', min: 1 },
      { nama: 'Bawang Merah', kategori: 'Bumbu', satuan: 'kg', min: 1 },
      { nama: 'Bumbu Halus & Kunyit', kategori: 'Bumbu', satuan: 'gram', min: 500 },
      { nama: 'Lunch Box', kategori: 'Bahan Kemasan', satuan: 'buah', min: 50 },
      { nama: 'Gelas Plastik', kategori: 'Bahan Kemasan', satuan: 'buah', min: 50 },
      { nama: 'Botol Sambal 100 ml', kategori: 'Bahan Kemasan', satuan: 'botol', min: 30 },
      { nama: 'Botol Sambal 150 ml', kategori: 'Bahan Kemasan', satuan: 'botol', min: 30 },
      { nama: 'Botol Sambal 200 ml', kategori: 'Bahan Kemasan', satuan: 'botol', min: 20 },
    ];

    const insertedBahan = await tx
      .insert(bahan)
      .values(
        materialSeeds.map((item) => ({
          nama_bahan: item.nama,
          id_kategori: katId.get(item.kategori)!,
          id_satuan: satId.get(item.satuan)!,
          stok_saat_ini: '0.00',
          stok_minimum: item.min.toFixed(2),
          harga_terakhir: 0,
          aktif: true,
        })),
      )
      .returning({ id_bahan: bahan.id_bahan, nama_bahan: bahan.nama_bahan });
    const matId = new Map(insertedBahan.map((row) => [row.nama_bahan, row.id_bahan]));

    type SeedTx = {
      daysAgo: number;
      jenis: 'masuk' | 'keluar';
      pemasok?: string;
      catatan: string;
      items: Array<{ bahan: string; jumlah: number; harga?: number }>;
    };

    const seedTransactions: SeedTx[] = [
      {
        daysAgo: 16,
        jenis: 'masuk',
        pemasok: 'Kios Sayur & Cabai Bu Sari',
        catatan: 'Stok cabai saat harga murah dan bumbu dasar',
        items: [
          { bahan: 'Cabai', jumlah: 4, harga: 50000 },
          { bahan: 'Bawang Putih', jumlah: 4, harga: 38000 },
          { bahan: 'Bawang Merah', jumlah: 4, harga: 34000 },
        ],
      },
      {
        daysAgo: 16,
        jenis: 'masuk',
        pemasok: 'Toko Sembako Pak Budi',
        catatan: 'Belanja minyak goreng stok dapur',
        items: [{ bahan: 'Minyak Goreng', jumlah: 12, harga: 17500 }],
      },
      {
        daysAgo: 14,
        jenis: 'masuk',
        pemasok: 'Agen Ayam Segar Gunungpati',
        catatan: 'Pembelian ayam presto segar',
        items: [{ bahan: 'Ayam', jumlah: 15, harga: 36000 }],
      },
      {
        daysAgo: 14,
        jenis: 'masuk',
        pemasok: 'Toko Sembako Pak Budi',
        catatan: 'Pembelian telur balut',
        items: [{ bahan: 'Telur', jumlah: 6, harga: 27000 }],
      },
      {
        daysAgo: 14,
        jenis: 'masuk',
        pemasok: 'Toko Kemasan Kalisegoro',
        catatan: 'Restock lunch box dan gelas',
        items: [
          { bahan: 'Lunch Box', jumlah: 200, harga: 1200 },
          { bahan: 'Gelas Plastik', jumlah: 150, harga: 350 },
        ],
      },
      {
        daysAgo: 12,
        jenis: 'keluar',
        catatan: 'Produksi ayam presto dan sambal mingguan',
        items: [
          { bahan: 'Ayam', jumlah: 11 },
          { bahan: 'Telur', jumlah: 4 },
          { bahan: 'Cabai', jumlah: 2.5 },
          { bahan: 'Minyak Goreng', jumlah: 6 },
          { bahan: 'Lunch Box', jumlah: 45 },
        ],
      },
      {
        daysAgo: 10,
        jenis: 'masuk',
        pemasok: 'Toko Sembako Pak Budi',
        catatan: 'Pembelian cabai alternatif dari toko sembako',
        items: [{ bahan: 'Cabai', jumlah: 3, harga: 55000 }],
      },
      {
        daysAgo: 10,
        jenis: 'masuk',
        pemasok: 'Kios Sayur & Cabai Bu Sari',
        catatan: 'Bumbu halus kunyit dan rempah',
        items: [{ bahan: 'Bumbu Halus & Kunyit', jumlah: 1500, harga: 40 }],
      },
      {
        daysAgo: 10,
        jenis: 'masuk',
        pemasok: 'Toko Kemasan Kalisegoro',
        catatan: 'Botol sambal kemasan 100 ml, 150 ml, 200 ml',
        items: [
          { bahan: 'Botol Sambal 100 ml', jumlah: 80, harga: 1500 },
          { bahan: 'Botol Sambal 150 ml', jumlah: 60, harga: 1800 },
          { bahan: 'Botol Sambal 200 ml', jumlah: 60, harga: 2200 },
        ],
      },
      {
        daysAgo: 7,
        jenis: 'masuk',
        pemasok: 'Agen Ayam Segar Gunungpati',
        catatan: 'Belanja ayam sebelum akhir pekan',
        items: [{ bahan: 'Ayam', jumlah: 14, harga: 37000 }],
      },
      {
        daysAgo: 7,
        jenis: 'masuk',
        pemasok: 'Toko Sembako Pak Budi',
        catatan: 'Belanja telur dan minyak goreng',
        items: [
          { bahan: 'Telur', jumlah: 6, harga: 28000 },
          { bahan: 'Minyak Goreng', jumlah: 10, harga: 18000 },
        ],
      },
      {
        daysAgo: 7,
        jenis: 'masuk',
        pemasok: 'Kios Sayur & Cabai Bu Sari',
        catatan: 'Lalapan segar harian',
        items: [{ bahan: 'Sayur Lalapan', jumlah: 10, harga: 3500 }],
      },
      {
        daysAgo: 5,
        jenis: 'keluar',
        catatan: 'Produksi ramai mahasiswa dan pesanan sambal botol',
        items: [
          { bahan: 'Ayam', jumlah: 12 },
          { bahan: 'Telur', jumlah: 4 },
          { bahan: 'Cabai', jumlah: 2.5 },
          { bahan: 'Minyak Goreng', jumlah: 6 },
          { bahan: 'Sayur Lalapan', jumlah: 8 },
          { bahan: 'Bawang Putih', jumlah: 1.5 },
          { bahan: 'Bawang Merah', jumlah: 2 },
          { bahan: 'Botol Sambal 100 ml', jumlah: 35 },
          { bahan: 'Botol Sambal 200 ml', jumlah: 25 },
        ],
      },
      {
        daysAgo: 4,
        jenis: 'masuk',
        pemasok: 'Kios Sayur & Cabai Bu Sari',
        catatan: 'Harga cabai mulai naik musim hujan',
        items: [{ bahan: 'Cabai', jumlah: 2, harga: 64000 }],
      },
      {
        daysAgo: 2,
        jenis: 'masuk',
        pemasok: 'Agen Ayam Segar Gunungpati',
        catatan: 'Pembelian ayam rutin',
        items: [{ bahan: 'Ayam', jumlah: 10, harga: 38000 }],
      },
      {
        daysAgo: 2,
        jenis: 'masuk',
        pemasok: 'Toko Sembako Pak Budi',
        catatan: 'Pembelian telur rutin',
        items: [{ bahan: 'Telur', jumlah: 4, harga: 28500 }],
      },
      {
        daysAgo: 1,
        jenis: 'keluar',
        catatan: 'Produksi kemarin',
        items: [
          { bahan: 'Ayam', jumlah: 8 },
          { bahan: 'Telur', jumlah: 4 },
          { bahan: 'Cabai', jumlah: 3.5 },
          { bahan: 'Minyak Goreng', jumlah: 3 },
          { bahan: 'Bumbu Halus & Kunyit', jumlah: 700 },
          { bahan: 'Lunch Box', jumlah: 35 },
          { bahan: 'Gelas Plastik', jumlah: 55 },
          { bahan: 'Botol Sambal 150 ml', jumlah: 40 },
        ],
      },
      {
        daysAgo: 0,
        jenis: 'masuk',
        pemasok: 'Kios Sayur & Cabai Bu Sari',
        catatan: 'Belanja pagi cabai dan sayur lalapan',
        items: [
          { bahan: 'Cabai', jumlah: 1, harga: 70000 },
          { bahan: 'Sayur Lalapan', jumlah: 8, harga: 4000 },
        ],
      },
      {
        daysAgo: 0,
        jenis: 'keluar',
        catatan: 'Pemakaian produksi hari ini',
        items: [
          { bahan: 'Ayam', jumlah: 5 },
          { bahan: 'Telur', jumlah: 2 },
          { bahan: 'Minyak Goreng', jumlah: 2 },
          { bahan: 'Sayur Lalapan', jumlah: 4 },
        ],
      },
    ];

    const runningStock = new Map<number, number>();
    const latestPrice = new Map<number, number>();

    for (const entry of seedTransactions) {
      const idTransaksi = crypto.randomUUID();
      await tx.insert(transaksi).values({
        id_transaksi: idTransaksi,
        waktu_transaksi: addDaysWib(-entry.daysAgo),
        jenis_transaksi: entry.jenis,
        id_pemasok: entry.pemasok ? supId.get(entry.pemasok)! : null,
        catatan: entry.catatan,
        id_user: owner.id_user,
      });

      for (const item of entry.items) {
        const idBahan = matId.get(item.bahan)!;
        const prevStock = runningStock.get(idBahan) ?? 0;

        if (entry.jenis === 'masuk') {
          const harga = item.harga!;
          runningStock.set(idBahan, roundQty(prevStock + item.jumlah));
          latestPrice.set(idBahan, harga);
          await tx.insert(detailTransaksi).values({
            id_transaksi: idTransaksi,
            id_bahan: idBahan,
            jumlah: roundQty(item.jumlah).toFixed(2),
            harga_beli_satuan: harga,
            harga_snapshot: harga,
          });
        } else {
          runningStock.set(idBahan, roundQty(prevStock - item.jumlah));
          await tx.insert(detailTransaksi).values({
            id_transaksi: idTransaksi,
            id_bahan: idBahan,
            jumlah: roundQty(item.jumlah).toFixed(2),
            harga_beli_satuan: null,
            harga_snapshot: latestPrice.get(idBahan) ?? 0,
          });
        }
      }
    }

    for (const row of insertedBahan) {
      await tx
        .update(bahan)
        .set({
          stok_saat_ini: (runningStock.get(row.id_bahan) ?? 0).toFixed(2),
          harga_terakhir: latestPrice.get(row.id_bahan) ?? 0,
          updated_at: new Date(),
        })
        .where(eq(bahan.id_bahan, row.id_bahan));
    }
  });

  return { seeded: true, counts: await getCounts(db) };
}

export function isDirectEntryPoint(
  argvPath: string | undefined,
  modulePath: string,
  platform: NodeJS.Platform = process.platform,
): boolean {
  if (!argvPath) return false;
  const resolvedArg = path.resolve(argvPath);
  const resolvedMod = path.resolve(modulePath);
  if (platform === 'win32') {
    return resolvedArg.toLowerCase() === resolvedMod.toLowerCase();
  }
  return resolvedArg === resolvedMod;
}

if (isDirectEntryPoint(process.argv[1], fileURLToPath(import.meta.url))) {
  const config = parseEnv();
  createDbClient({ databaseUrl: config.databaseUrl || undefined })
    .then(async (handle) => {
      try {
        if (handle.mode === 'pglite') {
          await bootstrapSchema(handle.db);
        }
        const result = await seedDatabase(handle.db);
        console.log('Seed selesai:', JSON.stringify(result));
      } finally {
        await handle.close();
      }
    })
    .catch((err) => {
      console.error('Gagal menjalankan seed:', err);
      process.exit(1);
    });
}
