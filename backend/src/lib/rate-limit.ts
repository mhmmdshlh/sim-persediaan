import { and, count, eq, gte, lt } from 'drizzle-orm';
import type { AppDb } from '../db/client.js';
import { loginAttempts } from '../db/schema.js';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

export function buildAttemptKey(ip: string, username: string): string {
  return `${ip}:${username}`.slice(0, 120);
}

export async function isLoginRateLimited(db: AppDb, attemptKey: string): Promise<boolean> {
  const cutoff = new Date(Date.now() - WINDOW_MS);
  const [row] = await db
    .select({ total: count() })
    .from(loginAttempts)
    .where(and(eq(loginAttempts.attempt_key, attemptKey), gte(loginAttempts.attempted_at, cutoff)));

  return Number(row?.total ?? 0) >= MAX_ATTEMPTS;
}

export async function recordFailedLogin(db: AppDb, attemptKey: string): Promise<void> {
  const cutoff = new Date(Date.now() - WINDOW_MS);
  await db.delete(loginAttempts).where(lt(loginAttempts.attempted_at, cutoff));
  await db.insert(loginAttempts).values({ attempt_key: attemptKey });
}

export async function clearLoginAttempts(db: AppDb, attemptKey: string): Promise<void> {
  await db.delete(loginAttempts).where(eq(loginAttempts.attempt_key, attemptKey));
}
