import { z } from 'zod';

const DEV_FALLBACK_JWT_SECRET = 'dev-only-stok-bledek-secret-change-in-production-32chars';

const rawEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  VERCEL: z.string().optional(),
  PORT: z.coerce.number().int().min(0).max(65535).default(3000),
  DATABASE_URL: z.string().trim().optional().default(''),
  JWT_SECRET: z.string().trim().optional().default(''),
  ALLOWED_ORIGINS: z.string().optional().default('http://localhost:5173'),
});

export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  isVercel: boolean;
  port: number;
  databaseUrl: string;
  jwtSecret: string;
  allowedOrigins: string[];
}

export function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, '');
}

export function parseEnv(raw: Record<string, string | undefined> = process.env): AppConfig {
  const parsed = rawEnvSchema.parse(raw);
  const isVercel = parsed.VERCEL === '1';
  const isDeployedProd = parsed.NODE_ENV === 'production' || isVercel;

  if (isDeployedProd && parsed.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET wajib diisi minimal 32 karakter pada lingkungan produksi/Vercel.');
  }

  if (isVercel && !parsed.DATABASE_URL) {
    throw new Error('DATABASE_URL wajib diisi saat menjalankan backend di Vercel.');
  }

  const jwtSecret = parsed.JWT_SECRET || DEV_FALLBACK_JWT_SECRET;
  const allowedOrigins = parsed.ALLOWED_ORIGINS.split(',')
    .map(normalizeOrigin)
    .filter(Boolean);

  return {
    nodeEnv: parsed.NODE_ENV,
    isVercel,
    port: parsed.PORT,
    databaseUrl: parsed.DATABASE_URL,
    jwtSecret,
    allowedOrigins,
  };
}
