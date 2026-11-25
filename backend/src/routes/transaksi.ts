import crypto from 'node:crypto';
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import type { AppDb } from '../db/client.js';
import { bahan, detailTransaksi, pemasok, satuan, transaksi } from '../db/schema.js';
import { AppError } from '../lib/errors.js';
import { roundQty, toNumber } from '../lib/numbers.js';
import { todayWib } from '../lib/time.js';
import {
  buildPagination,
  calendarDateSchema,
  MAX_INT4,
  MAX_NUMERIC_QTY,
  paginationQuerySchema,
} from '../lib/validation.js';

const detailMasukSchema = z.object({
  id_bahan: z.number().int().min(1, 'Bahan wajib dipilih.').max(MAX_INT4),
  jumlah: z
    .number()
    .finite()
    .min(0.01, 'Jumlah bahan minimal 0.01.')
    .max(MAX_NUMERIC_QTY, 'Jumlah bahan melebihi batas maksimal.'),
  harga_beli_satuan: z
    .number()
    .int('Harga beli harus berupa bilangan bulat Rupiah.')
    .min(1, 'Harga beli harus lebih besar dari nol.')
    .max(MAX_INT4, 'Harga beli melebihi batas maksimal.'),
});

const detailKeluarSchema = z.object({
  id_bahan: z.number().int().min(1, 'Bahan wajib dipilih.').max(MAX_INT4),
  jumlah: z
    .number()
    .finite()
    .min(0.01, 'Jumlah bahan minimal 0.01.')
    .max(MAX_NUMERIC_QTY, 'Jumlah bahan melebihi batas maksimal.'),
  harga_beli_satuan: z.null().optional().default(null),
});

const masukTransactionSchema = z.object({
  waktu_transaksi: calendarDateSchema.optional(),
  jenis_transaksi: z.literal('masuk'),
  id_pemasok: z.number().int().min(1, 'Pemasok wajib dipilih.').max(MAX_INT4),
  catatan: z.string().trim().max(500).optional().default(''),
  detail: z.array(detailMasukSchema).min(1, 'Minimal satu bahan harus dimasukkan.'),
});

const keluarTransactionSchema = z.object({
  waktu_transaksi: calendarDateSchema.optional(),
  jenis_transaksi: z.literal('keluar'),
  id_pemasok: z.null().optional().default(null),
  catatan: z.string().trim().max(500).optional().default(''),
  detail: z.array(detailKeluarSchema).min(1, 'Minimal satu bahan harus dimasukkan.'),
});

const createTransaksiSchema = z
  .discriminatedUnion('jenis_transaksi', [masukTransactionSchema, keluarTransactionSchema])
  .superRefine((data, ctx) => {
    const seen = new Set<number>();
    for (const item of data.detail) {
      if (seen.has(item.id_bahan)) {
        ctx.addIssue({
          code: 'custom',
          path: ['detail'],
          message: 'Bahan yang sama tidak boleh dimasukkan dua kali.',
        });
        return;
      }
      seen.add(item.id_bahan);
    }
  });

const listQuerySchema = paginationQuerySchema.extend({
  jenis_transaksi: z.enum(['masuk', 'keluar']).optional(),
  id_pemasok: z.coerce.number().int().min(1).max(MAX_INT4).optional(),
  id_bahan: z.coerce.number().int().min(1).max(MAX_INT4).optional(),
  start_date: calendarDateSchema.optional(),
  end_date: calendarDateSchema.optional(),
  search: z.string().trim().optional(),
});

const uuidParamSchema = z.string().uuid('ID transaksi tidak valid.');

type TxDb = Parameters<Parameters<AppDb['transaction']>[0]>[0];

async function refreshLatestPrice(tx: TxDb, materialId: number): Promise<void> {
  const [latest] = await tx
    .select({ harga: detailTransaksi.harga_beli_satuan })
    .from(detailTransaksi)
    .innerJoin(transaksi, eq(detailTransaksi.id_transaksi, transaksi.id_transaksi))
    .where(
      and(
        eq(detailTransaksi.id_bahan, materialId),
        eq(transaksi.jenis_transaksi, 'masuk'),
        sql`${detailTransaksi.harga_beli_satuan} IS NOT NULL`,
      ),
    )
    .orderBy(
      desc(transaksi.waktu_transaksi),
      desc(transaksi.created_at),
      desc(detailTransaksi.id_detail),
    )
    .limit(1);

  await tx
    .update(bahan)
    .set({ harga_terakhir: latest?.harga ?? 0, updated_at: new Date() })
    .where(eq(bahan.id_bahan, materialId));
}

async function hydrateTransactions(
  db: AppDb,
  headers: Array<{
    id_transaksi: string;
    waktu_transaksi: string;
    jenis_transaksi: 'masuk' | 'keluar';
    id_pemasok: number | null;
    nama_pemasok: string | null;
    catatan: string;
    created_at: Date;
  }>,
) {
  if (headers.length === 0) return [];

  const ids = headers.map((h) => h.id_transaksi);
  const detailRows = await db
    .select({
      id_transaksi: detailTransaksi.id_transaksi,
      id_bahan: detailTransaksi.id_bahan,
      nama_bahan: bahan.nama_bahan,
      satuan: satuan.nama_satuan,
      jumlah: detailTransaksi.jumlah,
      harga_beli_satuan: detailTransaksi.harga_beli_satuan,
    })
    .from(detailTransaksi)
    .innerJoin(bahan, eq(detailTransaksi.id_bahan, bahan.id_bahan))
    .innerJoin(satuan, eq(bahan.id_satuan, satuan.id_satuan))
    .where(inArray(detailTransaksi.id_transaksi, ids))
    .orderBy(asc(detailTransaksi.id_detail));

  const detailByTx = new Map<
    string,
    Array<{
      id_bahan: number;
      nama_bahan: string;
      satuan: string;
      jumlah: number;
      harga_beli_satuan: number | null;
      subtotal: number;
    }>
  >();

  for (const row of detailRows) {
    const jumlah = toNumber(row.jumlah);
    const subtotal =
      row.harga_beli_satuan !== null ? Math.round(jumlah * row.harga_beli_satuan) : 0;
    const list = detailByTx.get(row.id_transaksi) ?? [];
    list.push({
      id_bahan: row.id_bahan,
      nama_bahan: row.nama_bahan,
      satuan: row.satuan,
      jumlah,
      harga_beli_satuan: row.harga_beli_satuan,
      subtotal,
    });
    detailByTx.set(row.id_transaksi, list);
  }

  return headers.map((header) => {
    const detail = detailByTx.get(header.id_transaksi) ?? [];
    const totalPembelian =
      header.jenis_transaksi === 'masuk'
        ? detail.reduce((sum, item) => sum + item.subtotal, 0)
        : 0;

    return {
      id_transaksi: header.id_transaksi,
      waktu_transaksi: header.waktu_transaksi,
      jenis_transaksi: header.jenis_transaksi,
      id_pemasok: header.id_pemasok,
      nama_pemasok: header.nama_pemasok,
      catatan: header.catatan,
      created_at: header.created_at.toISOString(),
      total_pembelian: totalPembelian,
      detail,
    };
  });
}

async function fetchTransactionById(db: AppDb, id: string) {
  const headers = await db
    .select({
      id_transaksi: transaksi.id_transaksi,
      waktu_transaksi: transaksi.waktu_transaksi,
      jenis_transaksi: transaksi.jenis_transaksi,
      id_pemasok: transaksi.id_pemasok,
      nama_pemasok: pemasok.nama_pemasok,
      catatan: transaksi.catatan,
      created_at: transaksi.created_at,
    })
    .from(transaksi)
    .leftJoin(pemasok, eq(transaksi.id_pemasok, pemasok.id_pemasok))
    .where(eq(transaksi.id_transaksi, id))
    .limit(1);

  if (headers.length === 0) return null;
  const [hydrated] = await hydrateTransactions(db, headers);
  return hydrated;
}

export function createTransaksiRouter(db: AppDb): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    const query = listQuerySchema.parse(req.query);
    if (query.start_date && query.end_date && query.start_date > query.end_date) {
      throw new AppError(
        422,
        'VALIDATION_ERROR',
        'Tanggal mulai tidak boleh lebih besar dari tanggal akhir.',
      );
    }

    const conditions: SQL[] = [];
    if (query.jenis_transaksi) {
      conditions.push(eq(transaksi.jenis_transaksi, query.jenis_transaksi));
    }
    if (query.id_pemasok !== undefined) {
      conditions.push(eq(transaksi.id_pemasok, query.id_pemasok));
    }
    if (query.start_date) {
      conditions.push(gte(transaksi.waktu_transaksi, query.start_date));
    }
    if (query.end_date) {
      conditions.push(lte(transaksi.waktu_transaksi, query.end_date));
    }
    if (query.id_bahan !== undefined) {
      conditions.push(
        sql`EXISTS (SELECT 1 FROM detail_transaksi dt WHERE dt.id_transaksi = ${transaksi.id_transaksi} AND dt.id_bahan = ${query.id_bahan})`,
      );
    }
    if (query.search) {
      const pattern = `%${query.search}%`;
      conditions.push(
        or(
          ilike(transaksi.id_transaksi, pattern),
          sql`${transaksi.waktu_transaksi}::text ILIKE ${pattern}`,
          ilike(transaksi.catatan, pattern),
          ilike(pemasok.nama_pemasok, pattern),
        )!,
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalRow] = await db
      .select({ total: count() })
      .from(transaksi)
      .leftJoin(pemasok, eq(transaksi.id_pemasok, pemasok.id_pemasok))
      .where(whereClause);
    const totalItems = Number(totalRow?.total ?? 0);

    const headers = await db
      .select({
        id_transaksi: transaksi.id_transaksi,
        waktu_transaksi: transaksi.waktu_transaksi,
        jenis_transaksi: transaksi.jenis_transaksi,
        id_pemasok: transaksi.id_pemasok,
        nama_pemasok: pemasok.nama_pemasok,
        catatan: transaksi.catatan,
        created_at: transaksi.created_at,
      })
      .from(transaksi)
      .leftJoin(pemasok, eq(transaksi.id_pemasok, pemasok.id_pemasok))
      .where(whereClause)
      .orderBy(
        desc(transaksi.waktu_transaksi),
        desc(transaksi.created_at),
        desc(transaksi.id_transaksi),
      )
      .limit(query.page_size)
      .offset((query.page - 1) * query.page_size);

    const data = await hydrateTransactions(db, headers);
    res.json({
      data,
      pagination: buildPagination(query.page, query.page_size, totalItems),
    });
  });

  router.get('/:id', async (req, res) => {
    const parsedId = uuidParamSchema.safeParse(req.params.id);
    if (!parsedId.success) {
      throw new AppError(400, 'INVALID_ID', 'ID transaksi tidak valid.');
    }

    const item = await fetchTransactionById(db, parsedId.data);
    if (!item) {
      throw new AppError(404, 'NOT_FOUND', 'Transaksi tidak ditemukan.');
    }
    res.json({ data: item });
  });

  router.post('/', async (req, res) => {
    const body = createTransaksiSchema.parse(req.body);
    const waktuTransaksi = body.waktu_transaksi ?? todayWib();
    const idTransaksi = crypto.randomUUID();
    const userId = req.user!.id_user;

    await db.transaction(async (tx) => {
      if (body.jenis_transaksi === 'masuk') {
        const [sup] = await tx
          .select({ id_pemasok: pemasok.id_pemasok })
          .from(pemasok)
          .where(eq(pemasok.id_pemasok, body.id_pemasok))
          .limit(1);
        if (!sup) {
          throw new AppError(422, 'INVALID_REFERENCE', 'Pemasok tidak ditemukan.');
        }
      }

      // Sort by id_bahan so concurrent multi-item transactions lock rows in consistent order.
      const sortedDetail = [...body.detail].sort((a, b) => a.id_bahan - b.id_bahan);
      const materialIds = sortedDetail.map((item) => item.id_bahan);

      const existingMaterials = await tx
        .select({
          id_bahan: bahan.id_bahan,
          nama_bahan: bahan.nama_bahan,
          aktif: bahan.aktif,
          stok_saat_ini: bahan.stok_saat_ini,
          harga_terakhir: bahan.harga_terakhir,
          satuan: satuan.nama_satuan,
        })
        .from(bahan)
        .innerJoin(satuan, eq(bahan.id_satuan, satuan.id_satuan))
        .where(inArray(bahan.id_bahan, materialIds));

      const materialMap = new Map(existingMaterials.map((m) => [m.id_bahan, m]));

      for (const item of sortedDetail) {
        const mat = materialMap.get(item.id_bahan);
        if (!mat) {
          throw new AppError(422, 'INVALID_REFERENCE', `Bahan #${item.id_bahan} tidak ditemukan.`);
        }
        if (!mat.aktif) {
          throw new AppError(
            422,
            'INACTIVE_MATERIAL',
            `Bahan "${mat.nama_bahan}" sedang nonaktif dan tidak dapat ditransaksikan.`,
          );
        }
      }

      await tx.insert(transaksi).values({
        id_transaksi: idTransaksi,
        waktu_transaksi: waktuTransaksi,
        jenis_transaksi: body.jenis_transaksi,
        id_pemasok: body.jenis_transaksi === 'masuk' ? body.id_pemasok : null,
        catatan: body.catatan,
        id_user: userId,
      });

      if (body.jenis_transaksi === 'masuk') {
        for (const item of sortedDetail) {
          const qtyStr = roundQty(item.jumlah).toFixed(2);
          const harga = item.harga_beli_satuan!;

          await tx.insert(detailTransaksi).values({
            id_transaksi: idTransaksi,
            id_bahan: item.id_bahan,
            jumlah: qtyStr,
            harga_beli_satuan: harga,
            harga_snapshot: harga,
          });

          await tx
            .update(bahan)
            .set({
              stok_saat_ini: sql`ROUND((${bahan.stok_saat_ini} + ${qtyStr}::numeric), 2)`,
              updated_at: new Date(),
            })
            .where(eq(bahan.id_bahan, item.id_bahan));

          await refreshLatestPrice(tx, item.id_bahan);
        }
      } else {
        for (const item of sortedDetail) {
          const qtyStr = roundQty(item.jumlah).toFixed(2);
          const [updated] = await tx
            .update(bahan)
            .set({
              stok_saat_ini: sql`ROUND((${bahan.stok_saat_ini} - ${qtyStr}::numeric), 2)`,
              updated_at: new Date(),
            })
            .where(
              and(
                eq(bahan.id_bahan, item.id_bahan),
                eq(bahan.aktif, true),
                sql`${bahan.stok_saat_ini} >= ${qtyStr}::numeric`,
              ),
            )
            .returning({
              id_bahan: bahan.id_bahan,
              harga_terakhir: bahan.harga_terakhir,
            });

          if (!updated) {
            const mat = materialMap.get(item.id_bahan)!;
            throw new AppError(
              422,
              'INSUFFICIENT_STOCK',
              `Stok ${mat.nama_bahan} tidak mencukupi. Stok tersedia: ${toNumber(mat.stok_saat_ini)} ${mat.satuan}.`,
            );
          }

          await tx.insert(detailTransaksi).values({
            id_transaksi: idTransaksi,
            id_bahan: item.id_bahan,
            jumlah: qtyStr,
            harga_beli_satuan: null,
            harga_snapshot: updated.harga_terakhir,
          });
        }
      }
    });

    const created = await fetchTransactionById(db, idTransaksi);
    res.status(201).json({ data: created });
  });

  router.delete('/:id', async (req, res) => {
    const parsedId = uuidParamSchema.safeParse(req.params.id);
    if (!parsedId.success) {
      throw new AppError(400, 'INVALID_ID', 'ID transaksi tidak valid.');
    }
    const idTransaksi = parsedId.data;

    await db.transaction(async (tx) => {
      // Lock transaction header so concurrent DELETE requests cannot reverse stock twice.
      const [header] = await tx
        .select()
        .from(transaksi)
        .where(eq(transaksi.id_transaksi, idTransaksi))
        .for('update')
        .limit(1);

      if (!header) {
        throw new AppError(404, 'NOT_FOUND', 'Transaksi tidak ditemukan.');
      }

      const details = await tx
        .select()
        .from(detailTransaksi)
        .where(eq(detailTransaksi.id_transaksi, idTransaksi))
        .orderBy(asc(detailTransaksi.id_bahan));

      const [deletedHeader] = await tx
        .delete(transaksi)
        .where(eq(transaksi.id_transaksi, idTransaksi))
        .returning({ id_transaksi: transaksi.id_transaksi });

      if (!deletedHeader) {
        throw new AppError(404, 'NOT_FOUND', 'Transaksi tidak ditemukan.');
      }

      if (header.jenis_transaksi === 'masuk') {
        for (const item of details) {
          const [updated] = await tx
            .update(bahan)
            .set({
              stok_saat_ini: sql`ROUND((${bahan.stok_saat_ini} - ${item.jumlah}::numeric), 2)`,
              updated_at: new Date(),
            })
            .where(
              and(
                eq(bahan.id_bahan, item.id_bahan),
                sql`${bahan.stok_saat_ini} >= ${item.jumlah}::numeric`,
              ),
            )
            .returning({ id_bahan: bahan.id_bahan });

          if (!updated) {
            throw new AppError(
              409,
              'CONFLICT',
              'Transaksi masuk tidak dapat dibatalkan karena sebagian stok sudah terpakai.',
            );
          }
        }

        for (const item of details) {
          await refreshLatestPrice(tx, item.id_bahan);
        }
      } else {
        for (const item of details) {
          await tx
            .update(bahan)
            .set({
              stok_saat_ini: sql`ROUND((${bahan.stok_saat_ini} + ${item.jumlah}::numeric), 2)`,
              updated_at: new Date(),
            })
            .where(eq(bahan.id_bahan, item.id_bahan));
        }
      }
    });

    res.json({ data: { deleted: true, id_transaksi: idTransaksi } });
  });

  return router;
}
