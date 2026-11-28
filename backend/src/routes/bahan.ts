import { and, asc, count, eq, gt, ilike, lte, sql, type SQL } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import type { AppDb } from '../db/client.js';
import { bahan, kategori, satuan } from '../db/schema.js';
import { AppError } from '../lib/errors.js';
import { roundQty, toNumber } from '../lib/numbers.js';
import { computeStockStatus } from '../lib/stock.js';
import {
  buildPagination,
  isPgErrorCode,
  MAX_INT4,
  MAX_NUMERIC_QTY,
  paginationQuerySchema,
  parsePositiveIntId,
} from '../lib/validation.js';

const createBahanSchema = z.object({
  nama_bahan: z.string().trim().min(1, 'Nama bahan wajib diisi.').max(120),
  id_kategori: z.number().int().min(1, 'Kategori wajib dipilih.').max(MAX_INT4),
  id_satuan: z.number().int().min(1, 'Satuan wajib dipilih.').max(MAX_INT4),
  stok_minimum: z
    .number()
    .finite()
    .min(0, 'Stok minimum tidak boleh negatif.')
    .max(MAX_NUMERIC_QTY, 'Stok minimum melebihi batas maksimal.'),
  aktif: z.boolean().optional().default(true),
});

const updateBahanSchema = z
  .object({
    nama_bahan: z.string().trim().min(1, 'Nama bahan wajib diisi.').max(120).optional(),
    id_kategori: z.number().int().min(1, 'Kategori tidak valid.').max(MAX_INT4).optional(),
    id_satuan: z.number().int().min(1, 'Satuan tidak valid.').max(MAX_INT4).optional(),
    stok_minimum: z
      .number()
      .finite()
      .min(0, 'Stok minimum tidak boleh negatif.')
      .max(MAX_NUMERIC_QTY, 'Stok minimum melebihi batas maksimal.')
      .optional(),
    stok_saat_ini: z
      .number()
      .finite()
      .min(0, 'Stok saat ini tidak boleh negatif.')
      .max(MAX_NUMERIC_QTY, 'Stok saat ini melebihi batas maksimal.')
      .optional(),
    aktif: z.boolean().optional(),
  })
  .refine((val) => Object.keys(val).length > 0, {
    message: 'Minimal satu field harus diisi untuk diperbarui.',
  });

const listQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().optional(),
  aktif: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  id_kategori: z.coerce.number().int().min(1).max(MAX_INT4).optional(),
  status: z.enum(['habis', 'menipis', 'aman']).optional(),
});

interface RawBahanRow {
  id_bahan: number;
  nama_bahan: string;
  id_kategori: number;
  nama_kategori: string;
  id_satuan: number;
  nama_satuan: string;
  stok_saat_ini: string;
  stok_minimum: string;
  harga_terakhir: number;
  aktif: boolean;
}

function serializeBahan(row: RawBahanRow) {
  const stokSaatIni = toNumber(row.stok_saat_ini);
  const stokMinimum = toNumber(row.stok_minimum);
  return {
    id_bahan: row.id_bahan,
    nama_bahan: row.nama_bahan,
    id_kategori: row.id_kategori,
    nama_kategori: row.nama_kategori,
    id_satuan: row.id_satuan,
    nama_satuan: row.nama_satuan,
    stok_saat_ini: stokSaatIni,
    stok_minimum: stokMinimum,
    harga_terakhir: row.harga_terakhir,
    nilai_persediaan: Math.round(stokSaatIni * row.harga_terakhir),
    status: computeStockStatus(stokSaatIni, stokMinimum),
    aktif: row.aktif,
  };
}

async function fetchBahanById(db: AppDb, id: number) {
  const [row] = await db
    .select({
      id_bahan: bahan.id_bahan,
      nama_bahan: bahan.nama_bahan,
      id_kategori: bahan.id_kategori,
      nama_kategori: kategori.nama_kategori,
      id_satuan: bahan.id_satuan,
      nama_satuan: satuan.nama_satuan,
      stok_saat_ini: bahan.stok_saat_ini,
      stok_minimum: bahan.stok_minimum,
      harga_terakhir: bahan.harga_terakhir,
      aktif: bahan.aktif,
    })
    .from(bahan)
    .innerJoin(kategori, eq(bahan.id_kategori, kategori.id_kategori))
    .innerJoin(satuan, eq(bahan.id_satuan, satuan.id_satuan))
    .where(eq(bahan.id_bahan, id))
    .limit(1);

  return row ? serializeBahan(row) : null;
}

export function createBahanRouter(db: AppDb): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    const query = listQuerySchema.parse(req.query);
    const conditions: SQL[] = [];

    if (query.search) {
      conditions.push(ilike(bahan.nama_bahan, `%${query.search}%`));
    }
    if (query.aktif !== undefined) {
      conditions.push(eq(bahan.aktif, query.aktif));
    }
    if (query.id_kategori !== undefined) {
      conditions.push(eq(bahan.id_kategori, query.id_kategori));
    }
    if (query.status === 'habis') {
      conditions.push(lte(bahan.stok_saat_ini, '0'));
    } else if (query.status === 'menipis') {
      conditions.push(
        and(gt(bahan.stok_saat_ini, '0'), sql`${bahan.stok_saat_ini} <= ${bahan.stok_minimum}`)!,
      );
    } else if (query.status === 'aman') {
      conditions.push(sql`${bahan.stok_saat_ini} > ${bahan.stok_minimum}`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalRow] = await db.select({ total: count() }).from(bahan).where(whereClause);
    const totalItems = Number(totalRow?.total ?? 0);

    const rows = await db
      .select({
        id_bahan: bahan.id_bahan,
        nama_bahan: bahan.nama_bahan,
        id_kategori: bahan.id_kategori,
        nama_kategori: kategori.nama_kategori,
        id_satuan: bahan.id_satuan,
        nama_satuan: satuan.nama_satuan,
        stok_saat_ini: bahan.stok_saat_ini,
        stok_minimum: bahan.stok_minimum,
        harga_terakhir: bahan.harga_terakhir,
        aktif: bahan.aktif,
      })
      .from(bahan)
      .innerJoin(kategori, eq(bahan.id_kategori, kategori.id_kategori))
      .innerJoin(satuan, eq(bahan.id_satuan, satuan.id_satuan))
      .where(whereClause)
      .orderBy(asc(bahan.id_bahan))
      .limit(query.page_size)
      .offset((query.page - 1) * query.page_size);

    res.json({
      data: rows.map(serializeBahan),
      pagination: buildPagination(query.page, query.page_size, totalItems),
    });
  });

  router.get('/:id', async (req, res) => {
    const id = parsePositiveIntId(req.params.id);
    const item = await fetchBahanById(db, id);
    if (!item) {
      throw new AppError(404, 'NOT_FOUND', 'Bahan tidak ditemukan.');
    }
    res.json({ data: item });
  });

  router.post('/', async (req, res) => {
    const body = createBahanSchema.parse(req.body);
    try {
      const [inserted] = await db
        .insert(bahan)
        .values({
          nama_bahan: body.nama_bahan,
          id_kategori: body.id_kategori,
          id_satuan: body.id_satuan,
          stok_minimum: roundQty(body.stok_minimum).toFixed(2),
          aktif: body.aktif,
        })
        .returning({ id_bahan: bahan.id_bahan });

      const created = await fetchBahanById(db, inserted.id_bahan);
      res.status(201).json({ data: created });
    } catch (err) {
      if (isPgErrorCode(err, '23505')) {
        throw new AppError(409, 'CONFLICT', 'Nama bahan sudah terdaftar.');
      }
      if (isPgErrorCode(err, '23503')) {
        throw new AppError(422, 'INVALID_REFERENCE', 'Kategori atau satuan yang dipilih tidak ditemukan.');
      }
      throw err;
    }
  });

  router.patch('/:id', async (req, res) => {
    const id = parsePositiveIntId(req.params.id);
    const body = updateBahanSchema.parse(req.body);
    const updatePayload: Record<string, unknown> = { updated_at: new Date() };

    if (body.nama_bahan !== undefined) updatePayload.nama_bahan = body.nama_bahan;
    if (body.id_kategori !== undefined) updatePayload.id_kategori = body.id_kategori;
    if (body.id_satuan !== undefined) updatePayload.id_satuan = body.id_satuan;
    if (body.stok_minimum !== undefined) {
      updatePayload.stok_minimum = roundQty(body.stok_minimum).toFixed(2);
    }
    if (body.stok_saat_ini !== undefined) {
      updatePayload.stok_saat_ini = roundQty(body.stok_saat_ini).toFixed(2);
    }
    if (body.aktif !== undefined) updatePayload.aktif = body.aktif;

    try {
      const [updated] = await db
        .update(bahan)
        .set(updatePayload)
        .where(eq(bahan.id_bahan, id))
        .returning({ id_bahan: bahan.id_bahan });

      if (!updated) {
        throw new AppError(404, 'NOT_FOUND', 'Bahan tidak ditemukan.');
      }

      const item = await fetchBahanById(db, updated.id_bahan);
      res.json({ data: item });
    } catch (err) {
      if (isPgErrorCode(err, '23505')) {
        throw new AppError(409, 'CONFLICT', 'Nama bahan sudah terdaftar.');
      }
      if (isPgErrorCode(err, '23503')) {
        throw new AppError(422, 'INVALID_REFERENCE', 'Kategori atau satuan yang dipilih tidak ditemukan.');
      }
      throw err;
    }
  });

  router.delete('/:id', async (req, res) => {
    const id = parsePositiveIntId(req.params.id);
    const [updated] = await db
      .update(bahan)
      .set({ aktif: false, updated_at: new Date() })
      .where(eq(bahan.id_bahan, id))
      .returning({ id_bahan: bahan.id_bahan });

    if (!updated) {
      throw new AppError(404, 'NOT_FOUND', 'Bahan tidak ditemukan.');
    }

    const item = await fetchBahanById(db, updated.id_bahan);
    res.json({ data: item });
  });

  return router;
}
