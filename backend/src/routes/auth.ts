import { eq } from 'drizzle-orm';
import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import type { AppConfig } from '../config/env.js';
import type { AppDb } from '../db/client.js';
import { users } from '../db/schema.js';
import { AppError } from '../lib/errors.js';
import { signAuthToken, TOKEN_MAX_AGE_SECONDS } from '../lib/jwt.js';
import { verifyPassword } from '../lib/password.js';
import {
  buildAttemptKey,
  clearLoginAttempts,
  isLoginRateLimited,
  recordFailedLogin,
} from '../lib/rate-limit.js';
import { SESSION_COOKIE_NAME } from '../middleware/auth.js';

const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username wajib diisi.').transform((v) => v.toLowerCase()),
  password: z.string().min(1, 'Password wajib diisi.'),
});

export function createAuthRouter(db: AppDb, config: AppConfig, requireAuth: RequestHandler): Router {
  const router = Router();
  const isProd = config.nodeEnv === 'production';

  router.post('/login', async (req, res) => {
    const { username, password } = loginSchema.parse(req.body);
    const attemptKey = buildAttemptKey(req.ip ?? 'unknown', username);

    if (await isLoginRateLimited(db, attemptKey)) {
      throw new AppError(
        429,
        'RATE_LIMITED',
        'Terlalu banyak percobaan login gagal. Coba lagi dalam 15 menit.',
      );
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    const passwordValid = user && user.aktif
      ? await verifyPassword(password, user.password_hash)
      : false;

    if (!user || !user.aktif || !passwordValid) {
      await recordFailedLogin(db, attemptKey);
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Username atau password salah.');
    }

    await clearLoginAttempts(db, attemptKey);

    const token = await signAuthToken(user.id_user, user.username, config.jwtSecret);
    res.cookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: TOKEN_MAX_AGE_SECONDS * 1000,
      path: '/',
    });

    res.json({
      data: {
        user: {
          id_user: user.id_user,
          username: user.username,
          nama: user.nama,
        },
        token,
      },
    });
  });

  router.post('/logout', (_req, res) => {
    res.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
    });
    res.json({ data: { message: 'Berhasil keluar.' } });
  });

  router.get('/me', requireAuth, (req, res) => {
    res.json({ data: req.user });
  });

  return router;
}
