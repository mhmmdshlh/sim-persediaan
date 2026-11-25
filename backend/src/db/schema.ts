import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

export const JENIS_TRANSAKSI = ['masuk', 'keluar'] as const;
export type JenisTransaksi = (typeof JENIS_TRANSAKSI)[number];

export const users = pgTable('users', {
  id_user: serial('id_user').primaryKey(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  nama: varchar('nama', { length: 100 }).notNull(),
  password_hash: text('password_hash').notNull(),
  aktif: boolean('aktif').notNull().default(true),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const kategori = pgTable(
  'kategori',
  {
    id_kategori: serial('id_kategori').primaryKey(),
    nama_kategori: varchar('nama_kategori', { length: 100 }).notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('uq_kategori_nama_lower').on(sql`lower(${table.nama_kategori})`)],
);

export const satuan = pgTable(
  'satuan',
  {
    id_satuan: serial('id_satuan').primaryKey(),
    nama_satuan: varchar('nama_satuan', { length: 50 }).notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('uq_satuan_nama_lower').on(sql`lower(${table.nama_satuan})`)],
);

export const pemasok = pgTable(
  'pemasok',
  {
    id_pemasok: serial('id_pemasok').primaryKey(),
    nama_pemasok: varchar('nama_pemasok', { length: 120 }).notNull(),
    no_telepon: varchar('no_telepon', { length: 30 }).notNull().default(''),
    alamat: text('alamat').notNull().default(''),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('uq_pemasok_nama_lower').on(sql`lower(${table.nama_pemasok})`)],
);

export const bahan = pgTable(
  'bahan',
  {
    id_bahan: serial('id_bahan').primaryKey(),
    nama_bahan: varchar('nama_bahan', { length: 120 }).notNull(),
    id_kategori: integer('id_kategori')
      .notNull()
      .references(() => kategori.id_kategori, { onDelete: 'restrict' }),
    id_satuan: integer('id_satuan')
      .notNull()
      .references(() => satuan.id_satuan, { onDelete: 'restrict' }),
    stok_saat_ini: numeric('stok_saat_ini', { precision: 12, scale: 2 }).notNull().default('0'),
    stok_minimum: numeric('stok_minimum', { precision: 12, scale: 2 }).notNull().default('0'),
    harga_terakhir: integer('harga_terakhir').notNull().default(0),
    aktif: boolean('aktif').notNull().default(true),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('uq_bahan_nama_lower').on(sql`lower(${table.nama_bahan})`),
    check('bahan_stok_non_negative', sql`${table.stok_saat_ini} >= 0`),
  ],
);

export const transaksi = pgTable(
  'transaksi',
  {
    id_transaksi: varchar('id_transaksi', { length: 36 }).primaryKey(),
    waktu_transaksi: date('waktu_transaksi', { mode: 'string' }).notNull(),
    jenis_transaksi: varchar('jenis_transaksi', { length: 10 }).$type<JenisTransaksi>().notNull(),
    id_pemasok: integer('id_pemasok').references(() => pemasok.id_pemasok, {
      onDelete: 'restrict',
    }),
    catatan: text('catatan').notNull().default(''),
    id_user: integer('id_user')
      .notNull()
      .references(() => users.id_user, { onDelete: 'restrict' }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_transaksi_waktu_jenis').on(table.waktu_transaksi, table.jenis_transaksi),
  ],
);

export const detailTransaksi = pgTable(
  'detail_transaksi',
  {
    id_detail: serial('id_detail').primaryKey(),
    id_transaksi: varchar('id_transaksi', { length: 36 })
      .notNull()
      .references(() => transaksi.id_transaksi, { onDelete: 'cascade' }),
    id_bahan: integer('id_bahan')
      .notNull()
      .references(() => bahan.id_bahan, { onDelete: 'restrict' }),
    jumlah: numeric('jumlah', { precision: 12, scale: 2 }).notNull(),
    harga_beli_satuan: integer('harga_beli_satuan'),
    harga_snapshot: integer('harga_snapshot').notNull().default(0),
  },
  (table) => [
    check('detail_transaksi_jumlah_positive', sql`${table.jumlah} > 0`),
    check(
      'detail_transaksi_harga_positive',
      sql`${table.harga_beli_satuan} IS NULL OR ${table.harga_beli_satuan} > 0`,
    ),
    uniqueIndex('uq_detail_transaksi_item').on(table.id_transaksi, table.id_bahan),
    index('idx_detail_transaksi_bahan').on(table.id_bahan),
  ],
);

export const loginAttempts = pgTable(
  'login_attempts',
  {
    id: serial('id').primaryKey(),
    attempt_key: varchar('attempt_key', { length: 120 }).notNull(),
    attempted_at: timestamp('attempted_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('idx_login_attempts_key_time').on(table.attempt_key, table.attempted_at)],
);
