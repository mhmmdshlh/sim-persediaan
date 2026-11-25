import fs from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzlePg, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
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

// Source: https://orm.drizzle.team/docs/get-started-postgresql and https://orm.drizzle.team/docs/connect-pglite
export async function createDbClient(options: CreateDbOptions = {}): Promise<DbClientHandle> {
  if (options.databaseUrl) {
    const pool = new pg.Pool({
      connectionString: options.databaseUrl,
      max: options.isVercel ? 5 : 10,
    });
    const db = drizzlePg(pool, { schema });
    return {
      db,
      mode: 'postgres',
      close: async () => {
        await pool.end();
      },
    };
  }

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
