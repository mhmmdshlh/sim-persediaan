import { sql } from 'drizzle-orm';
import type { Express } from 'express';
import request from 'supertest';
import { createApp } from '../src/create-app.js';
import type { AppConfig } from '../src/config/env.js';
import { bootstrapSchema } from '../src/db/bootstrap.js';
import { createDbClient, type AppDb } from '../src/db/client.js';
import { users } from '../src/db/schema.js';
import { hashPassword } from '../src/lib/password.js';

export const TEST_CONFIG: AppConfig = {
  port: 0,
  nodeEnv: 'test',
  isVercel: false,
  databaseUrl: '',
  jwtSecret: 'test-secret-key-for-stok-bledek-minimum-32-chars',
  allowedOrigins: ['http://localhost:5173'],
};

export interface TestContext {
  app: Express;
  db: AppDb;
  close: () => Promise<void>;
}

export async function createTestApp(configOverrides: Partial<AppConfig> = {}): Promise<TestContext> {
  const client = await createDbClient({ memory: true });
  await bootstrapSchema(client.db);
  const app = createApp(client.db, { ...TEST_CONFIG, ...configOverrides });
  return {
    app,
    db: client.db,
    close: client.close,
  };
}

export async function resetDatabase(db: AppDb): Promise<void> {
  await db.execute(
    sql`TRUNCATE TABLE login_attempts, detail_transaksi, transaksi, bahan, pemasok, satuan, kategori, users RESTART IDENTITY CASCADE`,
  );
}

export async function createAndLoginOwner(app: Express, db: AppDb): Promise<string> {
  const passwordHash = await hashPassword('bledek123');
  await db.insert(users).values({
    username: 'pemilik',
    nama: 'Ramadhono Wahyu Nugroho',
    password_hash: passwordHash,
    aktif: true,
  });

  const res = await request(app)
    .post('/api/auth/login')
    .send({ username: 'pemilik', password: 'bledek123' });

  return res.body.data.token as string;
}
