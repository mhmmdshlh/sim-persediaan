import { and, eq } from 'drizzle-orm';
import type { NextFunction, Request, Response } from 'express';
import type { AppDb } from '../db/client.js';
import { users } from '../db/schema.js';
import { AppError } from '../lib/errors.js';
import { verifyAuthToken } from '../lib/jwt.js';

export const SESSION_COOKIE_NAME = 'stok_bledek_session';

export interface AuthUser {
  id_user: number;
  username: string;
  nama: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) return token;
  }

  const cookieToken = req.cookies?.[SESSION_COOKIE_NAME];
  if (typeof cookieToken === 'string' && cookieToken.trim()) {
    return cookieToken.trim();
  }

  return null;
}

export function createRequireAuth(db: AppDb, jwtSecret: string) {
  return async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const token = extractToken(req);
    if (!token) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Silakan masuk terlebih dahulu.');
    }

    const payload = await verifyAuthToken(token, jwtSecret);
    if (!payload) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Sesi tidak valid atau sudah kedaluwarsa.');
    }

    const userId = Number(payload.sub);
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Sesi tidak valid.');
    }

    const [user] = await db
      .select({
        id_user: users.id_user,
        username: users.username,
        nama: users.nama,
      })
      .from(users)
      .where(and(eq(users.id_user, userId), eq(users.aktif, true)))
      .limit(1);

    if (!user) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Akun tidak aktif atau tidak ditemukan.');
    }

    req.user = user;
    next();
  };
}
