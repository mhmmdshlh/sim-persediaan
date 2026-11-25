import cookieParser from 'cookie-parser';
import cors from 'cors';
import { sql } from 'drizzle-orm';
import express, { type Express } from 'express';
import helmet from 'helmet';
import type { AppConfig } from './config/env.js';
import type { AppDb } from './db/client.js';
import { AppError } from './lib/errors.js';
import { createRequireAuth } from './middleware/auth.js';
import { errorHandler } from './middleware/error-handler.js';
import { createAuthRouter } from './routes/auth.js';
import { createBahanRouter } from './routes/bahan.js';
import { createKategoriRouter } from './routes/kategori.js';
import { createPemasokRouter } from './routes/pemasok.js';
import { createSatuanRouter } from './routes/satuan.js';
import { createTransaksiRouter } from './routes/transaksi.js';

export function createApp(db: AppDb, config: AppConfig): Express {
  const app = express();
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || config.allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new AppError(403, 'CORS_DENIED', 'Origin tidak diizinkan mengakses API.'));
      },
      credentials: true,
    }),
  );
  app.use(cookieParser());
  app.use(express.json({ limit: '100kb' }));

  const requireAuth = createRequireAuth(db, config.jwtSecret);

  app.get('/api/health', async (_req, res) => {
    await db.execute(sql`SELECT 1`);
    res.json({
      data: {
        status: 'ok',
        db: 'connected',
        timezone: 'Asia/Jakarta',
      },
    });
  });

  app.use('/api/auth', createAuthRouter(db, config, requireAuth));
  app.use('/api/kategori', requireAuth, createKategoriRouter(db));
  app.use('/api/satuan', requireAuth, createSatuanRouter(db));
  app.use('/api/pemasok', requireAuth, createPemasokRouter(db));
  app.use('/api/bahan', requireAuth, createBahanRouter(db));
  app.use('/api/transaksi', requireAuth, createTransaksiRouter(db));

  app.use((_req, _res, next) => {
    next(new AppError(404, 'NOT_FOUND', 'Endpoint tidak ditemukan.'));
  });

  app.use(errorHandler);
  return app;
}
