# Rencana Implementasi Backend: Sistem Stok Bledek

> **Catatan untuk pelaksana:** Ikuti alur TDD (tulis tes gagal dulu, verifikasi gagal, implementasi minimal agar lulus, verifikasi lulus, commit) untuk setiap tugas. Gunakan `subagent-driven-development` atau `executing-plans` sesuai pilihan pengguna.

**Tujuan:** Membangun backend REST API lengkap di `backend/` (branch `feat/backend` pada repo `mhmmdshlh/sim-persediaan`) yang siap deploy ke Vercel bersama PostgreSQL (Neon), bisa dijalankan lokal tanpa setup database (PGlite), dan memenuhi seluruh 6 use case Sistem Stok Bledek.

**Arsitektur:** Monorepo dengan folder `backend/` terpisah dari `frontend/`. Express 5 + TypeScript ESM mengekspor instance `app` secara default untuk Vercel serverless dan menjalankan `app.listen` saat dijalankan lokal. Drizzle ORM memakai satu skema PostgreSQL (`src/db/schema.ts`) untuk dua mode koneksi: `pg` saat `DATABASE_URL` tersedia dan `@electric-sql/pglite` saat lokal atau testing.

**Tech Stack:** Node.js, Express 5, TypeScript 5, Drizzle ORM (`drizzle-orm`, `drizzle-kit`), `pg`, `@electric-sql/pglite`, `zod`, `jose`, `helmet`, `cors`, `cookie-parser`, `vitest`, `supertest`, `tsx`.

**Dokumen Spesifikasi:** [backend-design.md](file:///C:/Users/User/.gemini/antigravity/brain/82a1005c-42ff-407d-91f1-c325d3f0b22e/backend-design.md) (juga akan disalin dan di-commit ke `docs/superpowers/specs/2026-11-25-backend-design.md` di branch `feat/backend`).

---

## Global Constraints

- Repo lokal dikloning ke `d:\HBB\tgs kuliah\SIM\proyek\sim-persediaan` pada branch `feat/backend`; jangan ubah file di dalam `frontend/`.
- ESM (`"type": "module"`), TypeScript strict (`noUnusedLocals`, `noUnusedParameters`, `strict: true`).
- Prefix API: `/api`; semua kunci JSON `camelCase`; semua nilai enum `UPPER_SNAKE_CASE`; angka desimal dikembalikan sebagai `number` (dibulatkan 2 desimal), harga/uang sebagai bilangan bulat Rupiah (`integer`).
- Bentuk response sukses tunggal `{ data }`, daftar `{ data, pagination: { page, pageSize, totalItems, totalPages } }`, error `{ error: { code, message, details? } }`.
- Validasi hanya di boundary route menggunakan Zod; query database hanya melalui Drizzle terparameterisasi; tidak pernah membocorkan `passwordHash` atau stack trace.
- Password memakai `crypto.scrypt` bawaan Node.js + `crypto.timingSafeEqual`; token memakai JWT HS256 (`jose`, 24 jam) melalui cookie `httpOnly; sameSite=lax; secure` (produksi) dan didukung juga lewat `Authorization: Bearer <token>`.
- Hak akses ketat: `PEMILIK` (6 use case penuh) vs `STAF` (hanya login, baca master, catat transaksi masuk/keluar, lihat dashboard stok & peringatan).
- Mode `antislop` aktif (DURING): tanpa em dash (`—`) di teks/dokumentasi/pesan, tanpa komentar dekoratif/banner/emoji/narasi baris per baris, kode ringkas tanpa abstraksi berlebih (`ponytail`).

---

## Review Focus

Lima kelas input dan mode kegagalan yang paling mungkin muncul saat uji coba nyata dan harus dikunci lewat tes pada tugas pemiliknya:

1. **Konkurensi `KELUAR` dan presisi desimal**: dua permintaan `KELUAR` bersamaan atau pengurangan desimal (misal `0.30 - 0.25`) tidak boleh menghasilkan stok negatif maupun galat floating-point (`0.050000000000000044`). (Dikunci di Task 4)
2. **Transaksi `MASUK` mundur tanggal (backdate) terhadap `hargaTerakhir`**: mencatat nota lama (tanggal lebih awal dari pembelian terbaru) tetap menambah stok tetapi tidak menimpa `hargaTerakhir` dengan harga lama; menghapus transaksi `MASUK` terbaru memperbarui `hargaTerakhir` ke harga `MASUK` terbaru sebelumnya. (Dikunci di Task 4)
3. **Referensi bahan atau pemasok yang sudah dinonaktifkan (soft delete)**: `POST /api/transactions` ke bahan atau pemasok `isActive = false` ditolak (`404`/`422`), sementara laporan histori tetap menampilkan data transaksi lama tanpa error. (Dikunci di Task 3 dan Task 4)
4. **Input tidak valid di path, query, dan body**: `:id` non-numerik (`/api/materials/abc`), JSON rusak, rentang tanggal terbalik (`from > to`), atau `page=0` / `pageSize=999` harus mengembalikan `400` atau `422` dalam format error standar, bukan `500`. (Dikunci di Task 1, Task 3, Task 5)
5. **Zona waktu WIB (`Asia/Jakarta`) dan perilaku cold-start Vercel**: perhitungan "hari ini" pada dashboard dan deteksi otomatis `weekendMode` (Jumat/Sabtu) pada daftar belanja memakai `Asia/Jakarta` (bukan UTC), serta `src/index.ts` tidak memanggil `app.listen` saat `process.env.VERCEL === '1'` dan menolak start di produksi jika `JWT_SECRET` kosong. (Dikunci di Task 1 dan Task 5)

---

## Peta File (`backend/`)

- `backend/package.json`, `backend/tsconfig.json`, `backend/drizzle.config.ts`, `backend/vercel.json`, `backend/.env.example`: konfigurasi paket, build, Drizzle, dan deploy Vercel.
- `backend/src/config/env.ts`: parsing & validasi env (`DATABASE_URL`, `JWT_SECRET`, `ALLOWED_ORIGINS`, `PORT`, `NODE_ENV`, `VERCEL`).
- `backend/src/lib/errors.ts`: kelas `AppError` (`statusCode`, `code`, `message`, `details`).
- `backend/src/lib/numbers.ts`: helper pembulatan desimal 2 digit (`roundQty`) dan konversi string `numeric` Postgres ke `number`.
- `backend/src/lib/time.ts`: helper tanggal & hari dalam zona waktu `Asia/Jakarta` (`todayWib()`, `isPreWeekendWib(date?)`, `daysFromTodayWib(n)`).
- `backend/src/lib/password.ts`: `hashPassword(plain)` dan `verifyPassword(plain, stored)` dengan `crypto.scrypt`.
- `backend/src/lib/jwt.ts`: `signAuthToken(payload, secret)` dan `verifyAuthToken(token, secret)` dengan `jose`.
- `backend/src/lib/rate-limit.ts`: `checkLoginRateLimit`, `recordFailedLogin`, `clearLoginAttempts` berbasis tabel `login_attempts`.
- `backend/src/db/schema.ts`: 5 tabel Drizzle (`users`, `suppliers`, `materials`, `stockTransactions`, `loginAttempts`).
- `backend/src/db/bootstrap.ts`: eksekusi DDL `CREATE TABLE IF NOT EXISTS` dan indeks untuk PGlite lokal & testing.
- `backend/src/db/client.ts`: factory `createDbClient()` dual-mode (`pg` vs `PGlite`) + `getDb()` singleton untuk serverless reuse.
- `backend/src/db/seed.ts`: fungsi `seedDatabase(db)` idempoten (2 akun uji coba, 4 pemasok, 13 bahan, ~28 transaksi histori 3 minggu terakhir) + runner CLI.
- `backend/src/middleware/auth.ts`: `requireAuth` (cookie + Bearer) dan `requireRole('PEMILIK')`.
- `backend/src/middleware/error-handler.ts`: penanganan `SyntaxError` JSON, `ZodError`, `AppError`, constraint Postgres (`23505`/`23503`), dan fallback `500` aman.
- `backend/src/routes/auth.ts`: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`.
- `backend/src/routes/suppliers.ts`: CRUD + soft delete `/api/suppliers`.
- `backend/src/routes/materials.ts`: CRUD + soft delete + filter status `/api/materials`.
- `backend/src/routes/transactions.ts`: `GET/POST/DELETE /api/transactions` dengan transaksi atomik.
- `backend/src/routes/dashboard.ts`: `GET /api/dashboard/summary`.
- `backend/src/routes/reports.ts`: `/api/reports/stock`, `/api/reports/usage`, `/api/reports/price-history`, `/api/reports/shopping-list`.
- `backend/src/docs/openapi.ts`: spesifikasi OpenAPI 3.0 lengkap + handler `GET /api/openapi.json` dan `GET /docs`.
- `backend/src/app.ts`: `createApp(db, options)` merakit Helmet, CORS, JSON parser, cookie parser, semua route, docs, 404, dan error handler.
- `backend/src/index.ts`: default export Express app untuk Vercel (dengan lazy init DB/bootstrap) + `app.listen` saat lokal.
- `backend/README.md`: dokumentasi lengkap lokal, akun uji coba, panduan deploy Vercel + Neon Postgres, dan contoh sambungan dari `frontend/`.

---

### Task 1: Setup Repo, Branch `feat/backend`, Skema Database, dan Foundation App

**Files:**
- Clone repo ke: `d:\HBB\tgs kuliah\SIM\proyek\sim-persediaan` (checkout branch baru `feat/backend`)
- Modify: `.gitignore` (root repo: tambah `.env`, `.env.*`, `!.env.example`, `backend/data/`)
- Create: `docs/superpowers/specs/2026-11-25-backend-design.md`, `docs/superpowers/plans/2026-11-25-backend-implementation.md`
- Create: `backend/package.json`, `backend/tsconfig.json`, `backend/vitest.config.ts`, `backend/drizzle.config.ts`, `backend/vercel.json`, `backend/.env.example`
- Create: `backend/src/config/env.ts`, `backend/src/lib/errors.ts`, `backend/src/lib/numbers.ts`, `backend/src/lib/time.ts`
- Create: `backend/src/db/schema.ts`, `backend/src/db/bootstrap.ts`, `backend/src/db/client.ts`
- Create: `backend/src/middleware/error-handler.ts`, `backend/src/app.ts`, `backend/src/index.ts`
- Test: `backend/tests/helpers.ts`, `backend/tests/health.test.ts`

**Interfaces:**
- Produces:
  - `AppDb` (tipe Drizzle DB yang kompatibel dengan `node-postgres` dan `pglite`)
  - `createTestApp(): Promise<{ app: Express; db: AppDb; close: () => Promise<void> }>`
  - `createApp(db: AppDb, config: AppConfig): Express`
  - `AppError(statusCode: number, code: string, message: string, details?: unknown)`
  - `roundQty(value: number): number`, `toNumber(value: string | number): number`
  - `todayWib(now?: Date): string`, `isPreWeekendWib(now?: Date): boolean`, `addDaysWib(days: number, now?: Date): string`
  - Tabel Drizzle: `users`, `suppliers`, `materials`, `stockTransactions`, `loginAttempts`

- [ ] **Step 1: Siapkan clone repo, branch `feat/backend`, update `.gitignore`, salin spec & plan, dan pasang dependensi `backend/`**
  - Clone `https://github.com/mhmmdshlh/sim-persediaan.git` ke `d:\HBB\tgs kuliah\SIM\proyek\sim-persediaan`, buat branch `feat/backend`.
  - Buat `backend/package.json`, `tsconfig.json`, `vitest.config.ts`, `drizzle.config.ts`, `vercel.json`, `.env.example`, lalu jalankan `npm install` di `backend/`.

- [ ] **Step 2: Tulis tes gagal untuk health, error handling JSON rusak, 404, dan validasi env produksi (`backend/tests/health.test.ts`)**
  - Uji `GET /api/health` mengembalikan `200` dengan `{ data: { status: "ok", db: "connected", timezone: "Asia/Jakarta" } }`.
  - Uji route tidak dikenal (`GET /api/tidak-ada`) mengembalikan `404` dengan `{ error: { code: "NOT_FOUND", message: ... } }`.
  - Uji body JSON rusak (`Content-Type: application/json`, body `"{rusak"`) mengembalikan `400` dengan `{ error: { code: "INVALID_JSON", message: ... } }` tanpa stack trace.
  - Uji header keamanan Helmet (`x-content-type-options: nosniff`) hadir di response.
  - Uji `parseEnv({ NODE_ENV: 'production' })` tanpa `JWT_SECRET` melempar error, dan `isPreWeekendWib` mengenali Jumat/Sabtu WIB meskipun pada jam 01:00 WIB (masih hari sebelumnya dalam UTC).

- [ ] **Step 3: Jalankan tes dan pastikan gagal**
  - Run: `npm test -- tests/health.test.ts` (di `backend/`)
  - Expected: FAIL karena modul `src/app.ts` / `src/config/env.ts` belum ada.

- [ ] **Step 4: Implementasi skema 5 tabel Drizzle, bootstrap PGlite, client dual-mode, env, helper, error handler, `app.ts`, dan `index.ts`**
  - Pastikan `src/index.ts` mengekspor `default app` untuk Vercel dan hanya memanggil `app.listen` saat `process.env.VERCEL !== '1'` dan bukan lingkungan test.
  - Pastikan `bootstrapSchema(db)` membuat kelima tabel + constraint `CHECK (jumlah > 0)` + indeks `login_attempts(attempt_key, attempted_at)`.

- [ ] **Step 5: Verifikasi tes lulus dan build bersih**
  - Run: `npm test -- tests/health.test.ts && npm run build`
  - Expected: semua tes PASS, `tsc` selesai tanpa error.

- [ ] **Step 6: Commit**
  - `git commit -m "feat(backend): scaffold express drizzle app with dual-mode postgres"`

---

### Task 2: Autentikasi, Keamanan, Rate Limiting Serverless, dan RBAC

**Files:**
- Create: `backend/src/lib/password.ts`, `backend/src/lib/jwt.ts`, `backend/src/lib/rate-limit.ts`
- Create: `backend/src/middleware/auth.ts`, `backend/src/routes/auth.ts`
- Modify: `backend/src/app.ts` (pasang route `/api/auth`)
- Modify: `backend/tests/helpers.ts` (tambah helper `createUserAndLogin(app, db, role)`)
- Test: `backend/tests/auth.test.ts`

**Interfaces:**
- Consumes: `AppDb`, `users`, `loginAttempts`, `AppError`, `AppConfig` dari Task 1.
- Produces:
  - `hashPassword(plain: string): Promise<string>` dan `verifyPassword(plain: string, stored: string): Promise<boolean>`
  - `AuthUser = { id: number; username: string; nama: string; role: 'PEMILIK' | 'STAF' }`
  - `requireAuth` (mengisi `req.user: AuthUser` dari cookie `stok_bledek_session` atau header `Authorization: Bearer <token>`, menolak `401` jika tidak valid/user nonaktif)
  - `requireRole(...roles: Array<'PEMILIK' | 'STAF'>)` (menolak `403 FORBIDDEN` bila peran tidak cocok)

- [ ] **Step 1: Tulis tes gagal di `backend/tests/auth.test.ts`**
  - Login sukses dengan username/password benar mengembalikan `200`, `{ data: { user: { id, username, nama, role }, token } }`, tidak mengandung `passwordHash`, dan menyertakan cookie `Set-Cookie` dengan atribut `HttpOnly` dan `SameSite=Lax`.
  - `GET /api/auth/me` bekerja baik dengan cookie maupun dengan header `Authorization: Bearer <token>`.
  - `GET /api/auth/me` tanpa kredensial atau token rusak mengembalikan `401 UNAUTHENTICATED`.
  - Login dengan password salah mengembalikan `401 INVALID_CREDENTIALS`; percobaan ke-11 dalam 15 menit pada `(ip, username)` yang sama mengembalikan `429 RATE_LIMITED`.
  - Login dengan username huruf besar/campuran (`"Pemilik"`) dinormalisasi ke lowercase; login sukses mereset hitungan gagal untuk kunci tersebut.
  - `POST /api/auth/logout` menghapus cookie dan mengembalikan `200`.

- [ ] **Step 2: Jalankan tes dan pastikan gagal**
  - Run: `npm test -- tests/auth.test.ts`
  - Expected: FAIL (`404` untuk `/api/auth/login`).

- [ ] **Step 3: Implementasi `password.ts`, `jwt.ts`, `rate-limit.ts`, `middleware/auth.ts`, dan `routes/auth.ts`**
  - `password.ts`: `crypto.scrypt` dengan 16-byte random salt, keylen 64, verifikasi pakai `crypto.timingSafeEqual`.
  - `jwt.ts`: `SignJWT` / `jwtVerify` (HS256, `exp: 24h`) dari `jose`.
  - `rate-limit.ts`: hitung baris di `login_attempts` dalam 15 menit terakhir; batas 10 percobaan; bersihkan catatan lama agar tabel tidak membengkak.
  - `routes/auth.ts`: validasi Zod (`username` trim + lowercase, `password` min 1 karakter), set cookie `stok_bledek_session`.

- [ ] **Step 4: Jalankan tes dan pastikan lulus**
  - Run: `npm test -- tests/auth.test.ts`
  - Expected: semua tes PASS.

- [ ] **Step 5: Commit**
  - `git commit -m "feat(backend): add scrypt auth jwt cookie bearer rbac and db rate limiting"`

---

### Task 3: Master Data Pemasok (`suppliers`) dan Bahan (`materials`)

**Files:**
- Create: `backend/src/routes/suppliers.ts`, `backend/src/routes/materials.ts`
- Modify: `backend/src/app.ts` (pasang `/api/suppliers` dan `/api/materials`)
- Test: `backend/tests/master-data.test.ts`

**Interfaces:**
- Consumes: `AppDb`, `suppliers`, `materials`, `stockTransactions`, `requireAuth`, `requireRole`, `AppError`, `toNumber`, `roundQty`.
- Produces:
  - `computeStockStatus(stokSaatIni: number, stokMinimum: number): 'HABIS' | 'MENIPIS' | 'AMAN'`
  - Endpoints `/api/suppliers` (`GET`, `GET /:id`, `POST`, `PATCH /:id`, `DELETE /:id`)
  - Endpoints `/api/materials` (`GET`, `GET /:id`, `POST`, `PATCH /:id`, `DELETE /:id`)

- [ ] **Step 1: Tulis tes gagal di `backend/tests/master-data.test.ts`**
  - **RBAC**: `STAF` dapat `GET /api/suppliers` dan `GET /api/materials` (`200`), tetapi mendapat `403 FORBIDDEN` pada `POST/PATCH/DELETE /api/suppliers` dan `POST/PATCH/DELETE /api/materials`.
  - **CRUD Suppliers**: `PEMILIK` membuat pemasok (`201`), membaca daftar dengan `search` & `pagination`, membaca detail (`GET /:id`), mengubah sebagian field dengan `PATCH /:id`, dan menghapus lunak dengan `DELETE /:id` (tidak lagi muncul di daftar aktif).
  - **CRUD Materials**: `PEMILIK` membuat bahan (`201`, otomatis menghitung `status`: `HABIS`/`MENIPIS`/`AMAN`), kode duplikat ditolak `409 CONFLICT`, `PATCH /:id` mengubah `stokMinimum`/`nama`/`lokasiSimpan` (mengabaikan/menolak ubah `stokSaatIni` langsung), `DELETE /:id` menonaktifkan bahan (`isActive = false`).
  - **Filter & Pagination**: `GET /api/materials?status=MENIPIS`, `?kategori=KEMASAN`, `?lokasiSimpan=FREEZER`, `?search=cabai`, `?page=1&pageSize=2`; nilai invalid seperti `page=0`, `pageSize=500`, atau `:id=abc` ditolak `400`/`422`.
  - **Review Focus (soft delete)**: `POST /api/materials` dengan `pemasokUtamaId` milik pemasok yang sudah dinonaktifkan ditolak `422`.

- [ ] **Step 2: Jalankan tes dan pastikan gagal**
  - Run: `npm test -- tests/master-data.test.ts`
  - Expected: FAIL (`404`).

- [ ] **Step 3: Implementasi `routes/suppliers.ts` dan `routes/materials.ts`**
  - Semua response `materials` menyertakan field terhitung `status` (`HABIS` | `MENIPIS` | `AMAN`), nilai persediaan per item (`nilaiPersediaan = Math.round(stokSaatIni * hargaTerakhir)`), serta ringkasan `pemasokUtama: { id, nama, telepon, hariTutup } | null`.
  - `GET /api/materials/:id` menyertakan `recentTransactions` (10 transaksi terakhir bahan tersebut).

- [ ] **Step 4: Jalankan tes dan pastikan lulus**
  - Run: `npm test -- tests/master-data.test.ts`
  - Expected: semua tes PASS.

- [ ] **Step 5: Commit**
  - `git commit -m "feat(backend): add suppliers and materials master data endpoints with rbac"`

---

### Task 4: Transaksi Persediaan (`MASUK` & `KELUAR`) dengan Update Stok Atomik

**Files:**
- Create: `backend/src/routes/transactions.ts`
- Modify: `backend/src/app.ts` (pasang `/api/transactions`)
- Test: `backend/tests/transactions.test.ts`

**Interfaces:**
- Consumes: `AppDb`, `materials`, `suppliers`, `stockTransactions`, `users`, `requireAuth`, `requireRole`, `AppError`, `roundQty`, `toNumber`, `todayWib`.
- Produces:
  - `GET /api/transactions` (filter `tipe`, `materialId`, `supplierId`, `from`, `to`, pagination)
  - `POST /api/transactions` (discriminated union Zod: `tipe: 'MASUK'` vs `tipe: 'KELUAR'`)
  - `DELETE /api/transactions/:id` (khusus `PEMILIK`, membalikkan mutasi stok atomik)

- [ ] **Step 1: Tulis tes gagal di `backend/tests/transactions.test.ts`**
  - **MASUK oleh STAF & PEMILIK**: mencatat `MASUK` (misal cabai `2.5` kg @ `60000`) mengembalikan `201` dengan `totalHarga: 150000`, menambah `materials.stokSaatIni`, dan memperbarui `materials.hargaTerakhir = 60000`.
  - **KELUAR oleh STAF & PEMILIK**: mencatat `KELUAR` (`0.25` kg dari stok `0.30` kg) menyisakan stok tepat `0.05` (tanpa galat float) dan mencatat snapshot `hargaSatuan = hargaTerakhir` bahan.
  - **Stok tidak cukup**: `KELUAR` melebihi `stokSaatIni` ditolak `422 INSUFFICIENT_STOCK` dan saldo stok tidak berubah.
  - **Review Focus (Konkurensi)**: dua `POST /api/transactions` `KELUAR` masing-masing `6` kg secara paralel (`Promise.all`) terhadap stok `10` kg menghasilkan tepat 1 sukses (`201`) dan 1 ditolak (`422 INSUFFICIENT_STOCK`), saldo akhir `4` kg (tidak pernah minus).
  - **Review Focus (Backdate `hargaTerakhir`)**: setelah `MASUK` tanggal `2026-11-24` harga `70000`, input `MASUK` backdate tanggal `2026-11-10` harga `50000` menambah stok tetapi menjaga `hargaTerakhir` tetap `70000`.
  - **Review Focus (Soft delete)**: `POST /api/transactions` untuk bahan atau pemasok yang sudah dinonaktifkan ditolak `404`/`422`.
  - **Pembatalan transaksi (`DELETE /:id`)**: `STAF` ditolak `403`; `PEMILIK` bisa membatalkan `KELUAR` (stok kembali naik) dan membatalkan `MASUK` (stok turun dan `hargaTerakhir` kembali ke `MASUK` terbaru sebelumnya); pembatalan `MASUK` yang akan membuat stok negatif ditolak `409 CONFLICT`.
  - **Filter riwayat**: `GET /api/transactions?tipe=MASUK&materialId=...&from=...&to=...` mengembalikan urutan terbaru dulu + info nama bahan, pemasok, dan pencatat; `from > to` ditolak `422`.

- [ ] **Step 2: Jalankan tes dan pastikan gagal**
  - Run: `npm test -- tests/transactions.test.ts`
  - Expected: FAIL (`404`).

- [ ] **Step 3: Implementasi `routes/transactions.ts`**
  - Jalankan mutasi stok dan insert/delete transaksi di dalam `db.transaction(async (tx) => ...)`.
  - Untuk `KELUAR`, gunakan conditional update atomik `WHERE id = $1 AND is_active = true AND stok_saat_ini >= $2` (ditambah `ROUND((stok_saat_ini - $2)::numeric, 2)`).
  - Untuk `MASUK` dan `DELETE MASUK`, hitung ulang `harga_terakhir` dari transaksi `MASUK` terbaru (`ORDER BY tanggal DESC, id DESC LIMIT 1`) jika ada.

- [ ] **Step 4: Jalankan tes dan pastikan lulus**
  - Run: `npm test -- tests/transactions.test.ts`
  - Expected: semua tes PASS (termasuk uji konkurensi paralel).

- [ ] **Step 5: Commit**
  - `git commit -m "feat(backend): add atomic stock transactions with concurrency and price tracking"`

---

### Task 5: Dashboard Operasional dan 4 Laporan MIS + Daftar Belanja

**Files:**
- Create: `backend/src/routes/dashboard.ts`, `backend/src/routes/reports.ts`
- Modify: `backend/src/app.ts` (pasang `/api/dashboard` dan `/api/reports`)
- Test: `backend/tests/reports.test.ts`

**Interfaces:**
- Consumes: `AppDb`, `materials`, `suppliers`, `stockTransactions`, `requireAuth`, `requireRole`, `computeStockStatus`, `todayWib`, `isPreWeekendWib`, `addDaysWib`, `roundQty`, `toNumber`.
- Produces:
  - `GET /api/dashboard/summary` (akses: `PEMILIK` & `STAF`)
  - `GET /api/reports/stock` (akses: `PEMILIK`)
  - `GET /api/reports/usage` (akses: `PEMILIK`)
  - `GET /api/reports/price-history` (akses: `PEMILIK`)
  - `GET /api/reports/shopping-list` (akses: `PEMILIK`)

- [ ] **Step 1: Tulis tes gagal di `backend/tests/reports.test.ts`**
  - **RBAC**: `STAF` boleh mengakses `GET /api/dashboard/summary` (`200`), tetapi mendapat `403 FORBIDDEN` pada keempat endpoint `/api/reports/*`.
  - **Dashboard summary**: menghitung `counts` (`total`, `aman`, `menipis`, `habis`), mengurutkan `alerts` dari `HABIS` lalu rasio `stokSaatIni / stokMinimum` terendah, mendeteksi `expiringSoon` (transaksi `MASUK` yang `tanggalKedaluwarsa` berada antara hari ini hingga +7 hari WIB), menghitung `todayTransactions` (`masukCount`, `keluarCount`, `totalMasukValue`), dan mengembalikan `isPreWeekend` sesuai zona waktu WIB.
  - **Laporan stok (`GET /api/reports/stock`)**: mengembalikan `totalInventoryValue`, ringkasan per kategori (`BAHAN_BAKU`, `BUMBU`, `KEMASAN`), dan daftar bahan lengkap beserta `nilaiPersediaan`.
  - **Laporan pemakaian (`GET /api/reports/usage?from=...&to=...`)**: menghitung pemakaian per bahan, mengurutkan `mostUsedByCost` (bahan paling boros berdasarkan nilai pakai di atas, misal minyak goreng/ayam), dan merangkum `totalPurchaseSpend` vs `totalUsageValue`; rentang `from > to` ditolak `422`; transaksi lama dari bahan yang sudah di-soft-delete tetap terhitung tanpa error.
  - **Riwayat & tren harga (`GET /api/reports/price-history?materialId=...`)**: mengembalikan `points` terurut kronologis (`tanggal`, `hargaSatuan`, `jumlah`, `supplierNama`), ringkasan (`minPrice`, `maxPrice`, `avgPrice`, `latestPrice`, `changePercent`), serta `supplierComparison` (rata-rata, min, max, harga terakhir per pemasok); tanpa `materialId` ditolak `422`.
  - **Daftar belanja (`GET /api/reports/shopping-list?weekendMode=true|false`)**: saat `weekendMode=false`, menyertakan bahan dengan `stokSaatIni <= stokMinimum` dengan saran beli `Math.max(stokMinimum * 2 - stokSaatIni, stokMinimum)`; saat `weekendMode=true`, menyertakan bahan dengan `stokSaatIni <= stokMinimum * 1.5` dengan target stok `stokMinimum * 2.5` (buffer menjelang Minggu saat pemasok tutup), lengkap dengan info `pemasokUtama`, nomor WA, dan `estimatedTotalCost`.

- [ ] **Step 2: Jalankan tes dan pastikan gagal**
  - Run: `npm test -- tests/reports.test.ts`
  - Expected: FAIL (`404`).

- [ ] **Step 3: Implementasi `routes/dashboard.ts` dan `routes/reports.ts`**
  - Pastikan semua perhitungan tanggal memakai helper `Asia/Jakarta` dari `src/lib/time.ts`.
  - Gunakan query agregasi SQL Drizzle agar cepat di PostgreSQL (tidak menarik seluruh riwayat ke memori jika bisa diagregasi di DB).

- [ ] **Step 4: Jalankan tes dan pastikan lulus**
  - Run: `npm test -- tests/reports.test.ts`
  - Expected: semua tes PASS.

- [ ] **Step 5: Commit**
  - `git commit -m "feat(backend): add operational dashboard and management reports endpoints"`

---

### Task 6: Seed Realistis Sambel Bledek, OpenAPI `/docs`, Panduan Vercel & Frontend, dan Verifikasi Akhir

**Files:**
- Create: `backend/src/db/seed.ts`, `backend/src/docs/openapi.ts`, `backend/README.md`
- Modify: `backend/src/app.ts` (pasang `/api/openapi.json` dan `/docs`, sesuaikan CSP Helmet khusus `/docs` agar aset Swagger UI CDN bisa dimuat)
- Modify: `backend/src/index.ts` (auto-bootstrap + auto-seed hanya untuk mode lokal PGlite saat tabel `users` masih kosong)
- Test: `backend/tests/seed-and-docs.test.ts`

**Interfaces:**
- Consumes: seluruh tabel schema, `hashPassword`, `addDaysWib`, `createApp`.
- Produces:
  - `seedDatabase(db: AppDb): Promise<{ seeded: boolean; counts: { users: number; suppliers: number; materials: number; transactions: number } }>`
  - `GET /api/openapi.json` (OpenAPI 3.0.3 valid mencakup seluruh 20 endpoint + schema payload)
  - `GET /docs` (Swagger UI HTML siap klik)

- [ ] **Step 1: Tulis tes gagal di `backend/tests/seed-and-docs.test.ts`**
  - Memanggil `seedDatabase(db)` pertama kali mengisi 2 user (`pemilik`, `staf`), 4 pemasok, 13 bahan (termasuk ayam, telur, cabai, minyak goreng, sayur lalapan, bumbu, lunch box, gelas plastik, botol sambal 100/150/200 ml), dan >= 25 transaksi histori; memanggil `seedDatabase(db)` kedua kali bersifat idempoten (jumlah baris tidak bertambah ganda).
  - Setelah seed, login sebagai `pemilik` / `bledek123` berhasil dan keempat endpoint laporan + dashboard langsung mengembalikan data terisi (ada peringatan stok menipis, ada tren harga cabai Rp50.000-Rp70.000, ada perbandingan pemasok, ada daftar belanja).
  - `GET /api/openapi.json` mengembalikan `200` dengan `openapi: "3.0.3"` dan mendaftarkan seluruh path utama; `GET /docs` mengembalikan `200` bertipe `text/html`.

- [ ] **Step 2: Jalankan tes dan pastikan gagal**
  - Run: `npm test -- tests/seed-and-docs.test.ts`
  - Expected: FAIL.

- [ ] **Step 3: Implementasi `seed.ts`, `docs/openapi.ts`, pembaruan `app.ts`/`index.ts`, dan `backend/README.md`**
  - `backend/README.md` (bersih sesuai `antislop-copywriting`) mencakup:
    1. Cara menjalankan lokal (`npm install && npm run dev`, tanpa setup DB).
    2. Daftar akun uji coba (`pemilik` dan `staf`) beserta batas hak aksesnya.
    3. Cara deploy ke **Vercel + Neon Postgres** langkah demi langkah (buat project dengan Root Directory `backend`, klik Storage -> Neon Postgres untuk `DATABASE_URL`, isi `JWT_SECRET` dan `ALLOWED_ORIGINS`, jalankan `npm run db:push && npm run db:seed`).
    4. Panduan integrasi untuk M. Sholeh (contoh `vite.config.ts` proxy lokal dan `frontend/vercel.json` rewrite `/api/:path*` agar same-origin di HP, serta link `/docs`).
    5. Ringkasan 4 tabel utama untuk referensi ERD Haka dan aliran data untuk DFD Pramudya.

- [ ] **Step 4: Jalankan verifikasi menyeluruh**
  - Run:
    1. `npm test` (seluruh test suite hijau)
    2. `npm run build` (`tsc` lulus bersih tanpa warning/error)
    3. `npm audit --omit=dev` (tidak ada kerentanan kritikal/tinggi yang terjangkau)
    4. Smoke test server live (`npx tsx src/index.ts`, cek `GET /api/health`, `POST /api/auth/login`, `GET /api/dashboard/summary`, `GET /docs`, lalu hentikan server)
    5. Audit `antislop-code` dan `antislop-copywriting` di seluruh file `backend/` (cek tidak ada `—`, komentar dekoratif, atau `passwordHash` bocor).
    6. `git status` dan `git diff --stat` memastikan folder `frontend/` tidak tersentuh sama sekali.

- [ ] **Step 5: Commit**
  - `git commit -m "feat(backend): add realistic seed data openapi docs vercel guide and final verification"`
