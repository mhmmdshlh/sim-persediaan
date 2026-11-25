import 'dotenv/config';
import express, { type Express } from 'express';
import { createApp } from './app.js';
import { parseEnv } from './config/env.js';
import { bootstrapSchema } from './db/bootstrap.js';
import { createDbClient } from './db/client.js';
import { seedDatabase } from './db/seed.js';

const config = parseEnv();

let initializedAppPromise: Promise<Express> | null = null;

async function getInitializedApp(): Promise<Express> {
  if (!initializedAppPromise) {
    initializedAppPromise = (async () => {
      const handle = await createDbClient({
        databaseUrl: config.databaseUrl || undefined,
        isVercel: config.isVercel,
      });
      if (handle.mode === 'pglite') {
        await bootstrapSchema(handle.db);
        await seedDatabase(handle.db);
      }
      return createApp(handle.db, config);
    })();
  }
  return initializedAppPromise;
}

// Vercel invokes the default-exported Express app per serverless request.
// Source: https://vercel.com/docs/frameworks/backend/express
const entryApp = express();
entryApp.use(async (req, res, next) => {
  try {
    const inner = await getInitializedApp();
    inner(req, res, next);
  } catch (err) {
    next(err);
  }
});

export default entryApp;

if (!config.isVercel && config.nodeEnv !== 'test') {
  getInitializedApp()
    .then(() => {
      entryApp.listen(config.port, () => {
        console.log(`Sistem Stok Bledek API berjalan di http://localhost:${config.port}`);
        console.log(`Dokumentasi API: http://localhost:${config.port}/docs`);
      });
    })
    .catch((err) => {
      console.error('Gagal menjalankan server:', err);
      process.exit(1);
    });
}
