import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';

function getPgErrorCode(err: unknown): string | undefined {
  if (!err || typeof err !== 'object') return undefined;
  const record = err as { code?: unknown; cause?: { code?: unknown } };
  if (typeof record.code === 'string') return record.code;
  if (record.cause && typeof record.cause.code === 'string') return record.cause.code;
  return undefined;
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof SyntaxError && 'status' in err && (err as { status?: number }).status === 400) {
    res.status(400).json({
      error: {
        code: 'INVALID_JSON',
        message: 'Format JSON pada body request tidak valid.',
      },
    });
    return;
  }

  if (err instanceof ZodError) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const key = issue.path.length > 0 ? issue.path.join('.') : '_root';
      fieldErrors[key] = fieldErrors[key] ?? [];
      fieldErrors[key].push(issue.message);
    }
    res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Data yang dikirim tidak valid.',
        details: fieldErrors,
      },
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined ? { details: err.details } : {}),
      },
    });
    return;
  }

  const pgCode = getPgErrorCode(err);
  if (pgCode === '23505') {
    res.status(409).json({
      error: {
        code: 'CONFLICT',
        message: 'Data yang sama sudah terdaftar.',
      },
    });
    return;
  }

  if (pgCode === '23503') {
    res.status(422).json({
      error: {
        code: 'INVALID_REFERENCE',
        message: 'Referensi data terkait tidak ditemukan.',
      },
    });
    return;
  }

  console.error('[server-error]', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Terjadi kesalahan pada server.',
    },
  });
}
