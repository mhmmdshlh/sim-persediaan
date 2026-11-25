# Desain & Spesifikasi Backend: Sistem Stok Bledek (V2 - Sinkron Frontend)

Tanggal: 25 November 2026
Repo target: `https://github.com/mhmmdshlh/sim-persediaan` (folder `backend/`, branch `feat/backend`, berbasis `origin/main` commit `a96c2b7`)
Mitra: Griya Angkringan Sambel Bledek (Semarang)
Tenggat proyek: 3 Desember 2026

## 1. Pembaruan Kesepakatan Tim
- **Autentikasi tanpa pemisahan role**: sistem tetap mewajibkan login (agar tautan online tidak bisa diotak-atik pihak luar), tetapi tanpa peran Staf karena usaha tidak memiliki staf khusus pencatatan. Pengguna yang login (Pemilik) memiliki akses penuh.
- **Sinkron penuh dengan Frontend (`origin/main`)**: penamaan tabel, field JSON (`snake_case` bahasa Indonesia), struktur master data (`kategori`, `satuan`, `pemasok`, `bahan`), serta transaksi multi-item (`transaksi` + `detail_transaksi` dengan UUID `id_transaksi`) mengikuti langsung tipe di `frontend/src/types/`.
- **Penilaian Persediaan**: memakai metode **Harga Beli Terakhir** (`HARGA_BELI_TERAKHIR`: `stok_saat_ini * harga_terakhir`) untuk mengisi kartu Nilai Persediaan di `frontend/src/pages/laporan.tsx`.

## 2. Skema Basis Data (7 Tabel Bisnis + 1 Tabel Teknis)
- `users`: `id_user`, `username` (unique), `nama`, `password_hash` (`crypto.scrypt`), `aktif`, `created_at`
- `kategori`: `id_kategori`, `nama_kategori` (unique case-insensitive), `created_at`, `updated_at`
- `satuan`: `id_satuan`, `nama_satuan` (unique case-insensitive), `created_at`, `updated_at`
- `pemasok`: `id_pemasok`, `nama_pemasok` (unique case-insensitive), `no_telepon`, `alamat`, `created_at`, `updated_at`
- `bahan`: `id_bahan`, `nama_bahan` (unique case-insensitive), `id_kategori` (FK), `id_satuan` (FK), `stok_saat_ini`, `stok_minimum`, `harga_terakhir`, `aktif`, `created_at`, `updated_at`
- `transaksi`: `id_transaksi` (UUID varchar 36), `waktu_transaksi` (date), `jenis_transaksi` (`masuk` | `keluar`), `id_pemasok` (FK nullable), `catatan`, `id_user` (FK), `created_at`
- `detail_transaksi`: `id_detail`, `id_transaksi` (FK cascade), `id_bahan` (FK), `jumlah` (> 0), `harga_beli_satuan` (> 0 untuk `masuk`, null untuk `keluar`), `harga_snapshot`; unique `(id_transaksi, id_bahan)`
- `login_attempts`: `id`, `attempt_key`, `attempted_at` (proteksi brute-force login di serverless Vercel)

## 3. Kontrak REST API
Format response konsisten: `{ data }`, daftar berhalaman `{ data, pagination }`, error `{ error: { code, message, details? } }`.
- Publik: `GET /api/health`, `GET /api/openapi.json`, `GET /docs`, `POST /api/auth/login`, `POST /api/auth/logout`
- Wajib login (cookie `httpOnly` atau `Authorization: Bearer <token>`):
  - `GET /api/auth/me`
  - `GET/POST /api/kategori`, `PATCH/DELETE /api/kategori/:id`
  - `GET/POST /api/satuan`, `PATCH/DELETE /api/satuan/:id`
  - `GET/POST /api/pemasok`, `GET/PATCH/DELETE /api/pemasok/:id`
  - `GET/POST /api/bahan`, `GET/PATCH/DELETE /api/bahan/:id`
  - `GET/POST /api/transaksi`, `GET/DELETE /api/transaksi/:id`
  - `GET /api/dashboard`
  - `GET /api/laporan` (query `start_date`, `end_date`, `id_bahan`, `weekend_mode`)

## 4. Deploy Vercel dan Pengembangan Lokal
- Produksi Vercel: Root Directory `backend`, default export Express app di `src/index.ts`, database PostgreSQL lewat Vercel Storage (Neon) menggunakan `DATABASE_URL` (`pg` driver).
- Lokal dan Pengujian: jika `DATABASE_URL` kosong, otomatis memakai PostgreSQL lokal dalam proses (`@electric-sql/pglite`) tanpa perlu install XAMPP/Docker/cloud.
