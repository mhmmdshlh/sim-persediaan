import { sql } from 'drizzle-orm';
import type { AppDb } from './client.js';

// Mirrors src/db/schema.ts so local PGlite and in-memory tests run without drizzle-kit.
const DDL_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
    id_user SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    nama VARCHAR(100) NOT NULL,
    password_hash TEXT NOT NULL,
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS kategori (
    id_kategori SERIAL PRIMARY KEY,
    nama_kategori VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS uq_kategori_nama_lower ON kategori (lower(nama_kategori))`,
  `CREATE TABLE IF NOT EXISTS satuan (
    id_satuan SERIAL PRIMARY KEY,
    nama_satuan VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS uq_satuan_nama_lower ON satuan (lower(nama_satuan))`,
  `CREATE TABLE IF NOT EXISTS pemasok (
    id_pemasok SERIAL PRIMARY KEY,
    nama_pemasok VARCHAR(120) NOT NULL,
    no_telepon VARCHAR(30) NOT NULL DEFAULT '',
    alamat TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS uq_pemasok_nama_lower ON pemasok (lower(nama_pemasok))`,
  `CREATE TABLE IF NOT EXISTS bahan (
    id_bahan SERIAL PRIMARY KEY,
    nama_bahan VARCHAR(120) NOT NULL,
    id_kategori INTEGER NOT NULL REFERENCES kategori(id_kategori) ON DELETE RESTRICT,
    id_satuan INTEGER NOT NULL REFERENCES satuan(id_satuan) ON DELETE RESTRICT,
    stok_saat_ini NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (stok_saat_ini >= 0),
    stok_minimum NUMERIC(12, 2) NOT NULL DEFAULT 0,
    harga_terakhir INTEGER NOT NULL DEFAULT 0,
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS uq_bahan_nama_lower ON bahan (lower(nama_bahan))`,
  `CREATE TABLE IF NOT EXISTS transaksi (
    id_transaksi VARCHAR(36) PRIMARY KEY,
    waktu_transaksi DATE NOT NULL,
    jenis_transaksi VARCHAR(10) NOT NULL,
    id_pemasok INTEGER REFERENCES pemasok(id_pemasok) ON DELETE RESTRICT,
    catatan TEXT NOT NULL DEFAULT '',
    id_user INTEGER NOT NULL REFERENCES users(id_user) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_transaksi_waktu_jenis ON transaksi (waktu_transaksi, jenis_transaksi)`,
  `CREATE TABLE IF NOT EXISTS detail_transaksi (
    id_detail SERIAL PRIMARY KEY,
    id_transaksi VARCHAR(36) NOT NULL REFERENCES transaksi(id_transaksi) ON DELETE CASCADE,
    id_bahan INTEGER NOT NULL REFERENCES bahan(id_bahan) ON DELETE RESTRICT,
    jumlah NUMERIC(12, 2) NOT NULL CHECK (jumlah > 0),
    harga_beli_satuan INTEGER CHECK (harga_beli_satuan IS NULL OR harga_beli_satuan > 0),
    harga_snapshot INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS uq_detail_transaksi_item ON detail_transaksi (id_transaksi, id_bahan)`,
  `CREATE INDEX IF NOT EXISTS idx_detail_transaksi_bahan ON detail_transaksi (id_bahan)`,
  `CREATE TABLE IF NOT EXISTS login_attempts (
    id SERIAL PRIMARY KEY,
    attempt_key VARCHAR(120) NOT NULL,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_login_attempts_key_time ON login_attempts (attempt_key, attempted_at)`,
];

export async function bootstrapSchema(db: AppDb): Promise<void> {
  for (const statement of DDL_STATEMENTS) {
    await db.execute(sql.raw(statement));
  }
}
