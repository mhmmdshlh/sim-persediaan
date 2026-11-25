import { asc, eq, ilike } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import type { AppDb } from '../db/client.js';
import { satuan } from '../db/schema.js';
import { AppError } from '../lib/errors.js';
import { isPgErrorCode, parsePositiveIntId } from '../lib/validation.js';

const satuanBodySchema = z.object({
  nama_satuan: z.string().trim().min(1, 'Nama satuan wajib diisi.').max(50),
});

const listQuerySchema = z.object({
  search: z.string().trim().optional(),
});

export function createSatuanRouter(db: AppDb): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    const { search } = listQuerySchema.parse(req.query);
    const rows = await db
      .select({
        id_satuan: satuan.id_satuan,
        nama_satuan: satuan.nama_satuan,
      })
      .from(satuan)
      .where(search ? ilike(satuan.nama_satuan, `%${search}%`) : undefined)
      .orderBy(asc(satuan.id_satuan));

    res.json({ data: rows });
  });

  router.post('/', async (req, res) => {
    const body = satuanBodySchema.parse(req.body);
    try {
      const [created] = await db
        .insert(satuan)
        .values({ nama_satuan: body.nama_satuan })
        .returning({
          id_satuan: satuan.id_satuan,
          nama_satuan: satuan.nama_satuan,
        });
      res.status(201).json({ data: created });
    } catch (err) {
      if (isPgErrorCode(err, '23505')) {
        throw new AppError(409, 'CONFLICT', 'Satuan tersebut sudah terdaftar.');
      }
      throw err;
    }
  });

  router.patch('/:id', async (req, res) => {
    const id = parsePositiveIntId(req.params.id);
    const body = satuanBodySchema.parse(req.body);
    try {
      const [updated] = await db
        .update(satuan)
        .set({ nama_satuan: body.nama_satuan, updated_at: new Date() })
        .where(eq(satuan.id_satuan, id))
        .returning({
          id_satuan: satuan.id_satuan,
          nama_satuan: satuan.nama_satuan,
        });

      if (!updated) {
        throw new AppError(404, 'NOT_FOUND', 'Satuan tidak ditemukan.');
      }
      res.json({ data: updated });
    } catch (err) {
      if (isPgErrorCode(err, '23505')) {
        throw new AppError(409, 'CONFLICT', 'Satuan tersebut sudah terdaftar.');
      }
      throw err;
    }
  });

  router.delete('/:id', async (req, res) => {
    const id = parsePositiveIntId(req.params.id);
    try {
      const [deleted] = await db
        .delete(satuan)
        .where(eq(satuan.id_satuan, id))
        .returning({ id_satuan: satuan.id_satuan });

      if (!deleted) {
        throw new AppError(404, 'NOT_FOUND', 'Satuan tidak ditemukan.');
      }
      res.json({ data: { deleted: true, id_satuan: deleted.id_satuan } });
    } catch (err) {
      if (isPgErrorCode(err, '23503')) {
        throw new AppError(409, 'IN_USE', 'Satuan masih digunakan oleh data bahan.');
      }
      throw err;
    }
  });

  return router;
}
