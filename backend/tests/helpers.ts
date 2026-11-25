import type { Express } from 'express';
import { createApp } from '../src/app.js';
import type { AppConfig } from '../src/config/env.js';
import { createDbClient, type AppDb } from '../src/db/client.js';
import { bootstrapSchema } from '../src/db/bootstrap.js';

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
