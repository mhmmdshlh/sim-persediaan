import fs from 'node:fs';
import path from 'node:path';
import { drizzle as drizzlePg, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';

export type AppDb = NodePgDatabase<typeof schema>;

export interface DbClientHandle {
  db: AppDb;
  mode: 'postgres' | 'pglite';
  close: () => Promise<void>;
}

export interface CreateDbOptions {
  databaseUrl?: string;
  memory?: boolean;
  dataDir?: string;
  isVercel?: boolean;
}

export function createPgPool(databaseUrl: string, isVercel = false): pg.Pool {
  const pool = new pg.Pool({
    connectionString: databaseUrl,
    max: isVercel ? 5 : 10,
    idleTimeoutMillis: isVercel ? 10_000 : 30_000,
    connectionTimeoutMillis: 10_000,
  });

  // Prevent unhandled pool errors when Neon auto-suspends idle connections.
  pool.on('error', (err) => {
    console.error('[pg-pool-error]', err);
  });

  return pool;
}

// Source: https://orm.drizzle.team/docs/get-started-postgresql and https://orm.drizzle.team/docs/connect-pglite
export async function createDbClient(options: CreateDbOptions = {}): Promise<DbClientHandle> {
  if (options.databaseUrl) {
    const pool = createPgPool(options.databaseUrl, options.isVercel);
    const db = drizzlePg(pool, { schema });
    return {
      db,
      mode: 'postgres',
      close: async () => {
        await pool.end();
      },
    };
  }

  // Load PGlite lazily so Vercel PostgreSQL deployments do not bundle ~15 MB WASM.
  const [{ PGlite }, { drizzle: drizzlePglite }] = await Promise.all([
    import('@electric-sql/pglite'),
    import('drizzle-orm/pglite'),
  ]);

  const target = options.memory
    ? 'memory://'
    : options.dataDir ?? path.resolve(process.cwd(), 'data', 'pgdata');

  if (!options.memory) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
  }

  const pglite = new PGlite(target);
  await pglite.waitReady;
  const db = drizzlePglite(pglite, { schema }) as unknown as AppDb;

  return {
    db,
    mode: 'pglite',
    close: async () => {
      await pglite.close();
    },
  };
}
