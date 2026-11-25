import { z } from 'zod';
import { AppError } from './errors.js';

export const MAX_INT4 = 2_147_483_647;
export const MAX_NUMERIC_QTY = 9_999_999_999.99;

export function parsePositiveIntId(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || !/^\d+$/.test(value)) {
    throw new AppError(400, 'INVALID_ID', 'ID harus berupa bilangan bulat positif.');
  }
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0 || id > MAX_INT4) {
    throw new AppError(400, 'INVALID_ID', 'ID harus berupa bilangan bulat positif.');
  }
  return id;
}

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1, 'Halaman minimal 1.').max(MAX_INT4).default(1),
  page_size: z.coerce.number().int().min(1).max(100, 'Ukuran halaman maksimal 100.').default(50),
});

export interface PaginationMeta {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
}

export function buildPagination(page: number, pageSize: number, totalItems: number): PaginationMeta {
  return {
    page,
    page_size: pageSize,
    total_items: totalItems,
    total_pages: Math.max(1, Math.ceil(totalItems / pageSize)),
  };
}

export function isPgErrorCode(err: unknown, code: string): boolean {
  if (!err || typeof err !== 'object') return false;
  const record = err as { code?: unknown; cause?: { code?: unknown } };
  return record.code === code || record.cause?.code === code;
}

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD.');
