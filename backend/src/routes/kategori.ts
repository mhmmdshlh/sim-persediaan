import { asc, eq, ilike } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import type { AppDb } from '../db/client.js';
import { kategori } from '../db/schema.js';
import { AppError } from '../lib/errors.js';
import { isPgErrorCode, parsePositiveIntId } from '../lib/validation.js';

const kategoriBodySchema = z.object({
  nama_kategori: z.string().trim().min(1, 'Nama kategori wajib diisi.').max(100),
});

const listQuerySchema = z.object({
  search: z.string().trim().optional(),
});

export function createKategoriRouter(db: AppDb): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    const { search } = listQuerySchema.parse(req.query);
    const rows = await db
      .select({
        id_kategori: kategori.id_kategori,
        nama_kategori: kategori.nama_kategori,
      })
      .from(kategori)
      .where(search ? ilike(kategori.nama_kategori, `%${search}%`) : undefined)
      .orderBy(asc(kategori.id_kategori));

    res.json({ data: rows });
  });

  router.post('/', async (req, res) => {
    const body = kategoriBodySchema.parse(req.body);
    try {
      const [created] = await db
        .insert(kategori)
        .values({ nama_kategori: body.nama_kategori })
        .returning({
          id_kategori: kategori.id_kategori,
          nama_kategori: kategori.nama_kategori,
        });
      res.status(201).json({ data: created });
    } catch (err) {
      if (isPgErrorCode(err, '23505')) {
        throw new AppError(409, 'CONFLICT', 'Kategori tersebut sudah terdaftar.');
      }
      throw err;
    }
  });

  router.patch('/:id', async (req, res) => {
    const id = parsePositiveIntId(req.params.id);
    const body = kategoriBodySchema.parse(req.body);
    try {
      const [updated] = await db
        .update(kategori)
        .set({ nama_kategori: body.nama_kategori, updated_at: new Date() })
        .where(eq(kategori.id_kategori, id))
        .returning({
          id_kategori: kategori.id_kategori,
          nama_kategori: kategori.nama_kategori,
        });

      if (!updated) {
        throw new AppError(404, 'NOT_FOUND', 'Kategori tidak ditemukan.');
      }
      res.json({ data: updated });
    } catch (err) {
      if (isPgErrorCode(err, '23505')) {
        throw new AppError(409, 'CONFLICT', 'Kategori tersebut sudah terdaftar.');
      }
      throw err;
    }
  });

  router.delete('/:id', async (req, res) => {
    const id = parsePositiveIntId(req.params.id);
    try {
      const [deleted] = await db
        .delete(kategori)
        .where(eq(kategori.id_kategori, id))
        .returning({ id_kategori: kategori.id_kategori });

      if (!deleted) {
        throw new AppError(404, 'NOT_FOUND', 'Kategori tidak ditemukan.');
      }
      res.json({ data: { deleted: true, id_kategori: deleted.id_kategori } });
    } catch (err) {
      if (isPgErrorCode(err, '23503')) {
        throw new AppError(409, 'IN_USE', 'Kategori masih digunakan oleh data bahan.');
      }
      throw err;
    }
  });

  return router;
}
