import { asc, count, eq, ilike, or } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import type { AppDb } from '../db/client.js';
import { pemasok } from '../db/schema.js';
import { AppError } from '../lib/errors.js';
import {
  buildPagination,
  isPgErrorCode,
  paginationQuerySchema,
  parsePositiveIntId,
} from '../lib/validation.js';

const createPemasokSchema = z.object({
  nama_pemasok: z.string().trim().min(1, 'Nama pemasok wajib diisi.').max(120),
  no_telepon: z.string().trim().max(30).optional().default(''),
  alamat: z.string().trim().max(500).optional().default(''),
});

const updatePemasokSchema = z
  .object({
    nama_pemasok: z.string().trim().min(1, 'Nama pemasok wajib diisi.').max(120).optional(),
    no_telepon: z.string().trim().max(30).optional(),
    alamat: z.string().trim().max(500).optional(),
  })
  .refine((val) => Object.keys(val).length > 0, {
    message: 'Minimal satu field harus diisi untuk diperbarui.',
  });

const listQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().optional(),
});

const pemasokSelection = {
  id_pemasok: pemasok.id_pemasok,
  nama_pemasok: pemasok.nama_pemasok,
  no_telepon: pemasok.no_telepon,
  alamat: pemasok.alamat,
};

export function createPemasokRouter(db: AppDb): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    const { search, page, page_size } = listQuerySchema.parse(req.query);
    const whereClause = search
      ? or(
          ilike(pemasok.nama_pemasok, `%${search}%`),
          ilike(pemasok.no_telepon, `%${search}%`),
          ilike(pemasok.alamat, `%${search}%`),
        )
      : undefined;

    const [totalRow] = await db.select({ total: count() }).from(pemasok).where(whereClause);
    const totalItems = Number(totalRow?.total ?? 0);

    const rows = await db
      .select(pemasokSelection)
      .from(pemasok)
      .where(whereClause)
      .orderBy(asc(pemasok.id_pemasok))
      .limit(page_size)
      .offset((page - 1) * page_size);

    res.json({
      data: rows,
      pagination: buildPagination(page, page_size, totalItems),
    });
  });

  router.get('/:id', async (req, res) => {
    const id = parsePositiveIntId(req.params.id);
    const [row] = await db
      .select(pemasokSelection)
      .from(pemasok)
      .where(eq(pemasok.id_pemasok, id))
      .limit(1);

    if (!row) {
      throw new AppError(404, 'NOT_FOUND', 'Pemasok tidak ditemukan.');
    }
    res.json({ data: row });
  });

  router.post('/', async (req, res) => {
    const body = createPemasokSchema.parse(req.body);
    try {
      const [created] = await db
        .insert(pemasok)
        .values(body)
        .returning(pemasokSelection);
      res.status(201).json({ data: created });
    } catch (err) {
      if (isPgErrorCode(err, '23505')) {
        throw new AppError(409, 'CONFLICT', 'Nama pemasok sudah terdaftar.');
      }
      throw err;
    }
  });

  router.patch('/:id', async (req, res) => {
    const id = parsePositiveIntId(req.params.id);
    const body = updatePemasokSchema.parse(req.body);
    try {
      const [updated] = await db
        .update(pemasok)
        .set({ ...body, updated_at: new Date() })
        .where(eq(pemasok.id_pemasok, id))
        .returning(pemasokSelection);

      if (!updated) {
        throw new AppError(404, 'NOT_FOUND', 'Pemasok tidak ditemukan.');
      }
      res.json({ data: updated });
    } catch (err) {
      if (isPgErrorCode(err, '23505')) {
        throw new AppError(409, 'CONFLICT', 'Nama pemasok sudah terdaftar.');
      }
      throw err;
    }
  });

  router.delete('/:id', async (req, res) => {
    const id = parsePositiveIntId(req.params.id);
    try {
      const [deleted] = await db
        .delete(pemasok)
        .where(eq(pemasok.id_pemasok, id))
        .returning({ id_pemasok: pemasok.id_pemasok });

      if (!deleted) {
        throw new AppError(404, 'NOT_FOUND', 'Pemasok tidak ditemukan.');
      }
      res.json({ data: { deleted: true, id_pemasok: deleted.id_pemasok } });
    } catch (err) {
      if (isPgErrorCode(err, '23503')) {
        throw new AppError(409, 'IN_USE', 'Pemasok masih digunakan pada riwayat transaksi.');
      }
      throw err;
    }
  });

  return router;
}
