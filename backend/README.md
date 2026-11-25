# Backend Sistem Stok Bledek

REST API dan penyimpanan data untuk **Sistem Informasi Manajemen Persediaan Griya Angkringan Sambel Bledek** (Node.js, Express 5, TypeScript, Drizzle ORM, PostgreSQL).

## 1. Menjalankan Secara Lokal (Tanpa Install Database)

Jika variabel `DATABASE_URL` dikosongkan, backend otomatis menjalankan PostgreSQL lokal dalam proses (`PGlite`, tersimpan di `backend/data/pgdata`) dan mengisi data awal Sambel Bledek pada saat pertama kali dijalankan.

```bash
cd backend
npm install
npm run dev
```

Setelah berjalan:
- API aktif di `http://localhost:3000/api/health`
- Dokumentasi interaktif Swagger UI di `http://localhost:3000/docs`
- Spesifikasi OpenAPI 3.0.3 di `http://localhost:3000/api/openapi.json`

### Akun Uji Coba
- Username: `pemilik`
- Password: `bledek123`
- Nama: `Ramadhono Wahyu Nugroho`

Sistem memakai satu peran (pemilik usaha) dengan login wajib agar tautan online tidak bisa diubah pihak luar.

### Perintah Lainnya

```bash
npm test         # Menjalankan seluruh tes otomatis (Vitest + Supertest + PGlite memory)
npm run build    # Kompilasi TypeScript (tsc)
npm run db:push  # Dorong skema Drizzle ke PostgreSQL (saat DATABASE_URL diisi)
npm run db:seed  # Isi data contoh realistis Sambel Bledek (idempoten, aman dijalankan ulang)
```

---

## 2. Daftar Endpoint Utama

Seluruh endpoint selain `/api/health`, `/api/openapi.json`, `/docs`, `/api/auth/login`, dan `/api/auth/logout` membutuhkan sesi login (cookie `httpOnly` `stok_bledek_session` atau header `Authorization: Bearer <token>`).

| Modul | Endpoint | Keterangan |
|---|---|---|
| Sistem | `GET /api/health` | Status server dan koneksi database |
| Dokumentasi | `GET /docs`, `GET /api/openapi.json` | Swagger UI dan skema OpenAPI |
| Auth | `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` | Login, logout, dan cek sesi |
| Kategori | `GET/POST /api/kategori`, `PATCH/DELETE /api/kategori/:id` | Master kategori bahan |
| Satuan | `GET/POST /api/satuan`, `PATCH/DELETE /api/satuan/:id` | Master satuan pengukuran |
| Pemasok | `GET/POST /api/pemasok`, `GET/PATCH/DELETE /api/pemasok/:id` | Master pemasok langganan |
| Bahan | `GET/POST /api/bahan`, `GET/PATCH/DELETE /api/bahan/:id` | Master bahan + saldo stok & toggle `aktif` |
| Transaksi | `GET/POST /api/transaksi`, `GET/DELETE /api/transaksi/:id` | Pencatatan barang masuk & keluar multi-item atomik |
| Dashboard | `GET /api/dashboard` | Ringkasan harian, peringatan stok menipis/habis, 5 transaksi terbaru |
| Laporan | `GET /api/laporan` | Pemakaian, riwayat harga, perbandingan pemasok, nilai persediaan, daftar belanja |

Format error konsisten di semua endpoint:

```json
{
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Stok Ayam tidak mencukupi. Stok tersedia: 3 kg."
  }
}
```

---

## 3. Catatan Integrasi untuk Frontend (`frontend/`)

Nama field JSON diselaraskan dengan `frontend/src/types/` (`id_bahan`, `nama_bahan`, `id_kategori`, `id_satuan`, `stok_minimum`, `aktif`, `id_pemasok`, `nama_pemasok`, `no_telepon`, `alamat`, `id_transaksi` UUID, `waktu_transaksi`, `jenis_transaksi: "masuk" | "keluar"`, dan `detail`).

- **Nilai Persediaan (`frontend/src/pages/laporan.tsx`)**: backend menghitung dengan metode **`HARGA_BELI_TERAKHIR`** (`stok_saat_ini * harga_terakhir`), tersedia pada `data.nilai_persediaan` di `GET /api/laporan`.
- **Pengembangan lokal**: tambahkan proxy `/api` di `frontend/vite.config.ts` agar request frontend bersifat same-origin dengan backend lokal:

```ts
server: {
  proxy: {
    '/api': 'http://localhost:3000',
  },
}
```

- **Produksi Vercel (disarankan untuk browser HP)**: tambahkan `frontend/vercel.json` agar `/api/*` diteruskan ke domain backend Vercel sehingga cookie `httpOnly` tidak terkena blokir third-party cookie di Safari/Chrome HP:

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://<domain-backend-vercel>/api/:path*"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

---

## 4. Panduan Deploy Online di Vercel + Neon Postgres

1. Gabungkan branch `feat/backend` ke `main` lewat Pull Request di GitHub.
2. Buka [Vercel Dashboard](https://vercel.com), klik **Add New Project**, pilih repo `mhmmdshlh/sim-persediaan`, lalu atur **Root Directory** menjadi `backend`.
3. Di dalam Project Backend tersebut, buka tab **Storage**, klik **Create Database**, lalu pilih **Neon** (paket gratis). Vercel otomatis menambahkan variabel `DATABASE_URL`.
4. Buka **Settings -> Environment Variables** dan tambahkan:
   - `NODE_ENV` = `production`
   - `JWT_SECRET` = string acak minimal 32 karakter (misalnya hasil `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
   - `ALLOWED_ORIGINS` = URL frontend Vercel (misalnya `https://sim-persediaan.vercel.app`)
5. Deploy ulang project backend di Vercel.
6. Sekali saja dari laptop, buat tabel dan isi data awal Sambel Bledek ke database Neon (salin `DATABASE_URL` dari tab Environment Variables Vercel):

```bash
cd backend
$env:DATABASE_URL="postgresql://..."
npm run db:push
npm run db:seed
```

7. Cek `https://<domain-backend-vercel>/api/health` untuk memastikan respons `{ "data": { "status": "ok", "db": "connected", "timezone": "Asia/Jakarta" } }`.

---

## 5. Acuan Skema Database untuk ERD

Tujuh tabel bisnis utama (`src/db/schema.ts`):
1. `users` (`id_user` PK, `username` UNIQUE, `nama`, `password_hash`, `aktif`, `created_at`)
2. `kategori` (`id_kategori` PK, `nama_kategori` UNIQUE)
3. `satuan` (`id_satuan` PK, `nama_satuan` UNIQUE)
4. `pemasok` (`id_pemasok` PK, `nama_pemasok` UNIQUE, `no_telepon`, `alamat`)
5. `bahan` (`id_bahan` PK, `nama_bahan` UNIQUE, `id_kategori` FK, `id_satuan` FK, `stok_saat_ini`, `stok_minimum`, `harga_terakhir`, `aktif`)
6. `transaksi` (`id_transaksi` UUID PK, `waktu_transaksi`, `jenis_transaksi`, `id_pemasok` FK nullable, `catatan`, `id_user` FK, `created_at`)
7. `detail_transaksi` (`id_detail` PK, `id_transaksi` FK cascade, `id_bahan` FK, `jumlah`, `harga_beli_satuan`, `harga_snapshot`)

Ditambah satu tabel teknis `login_attempts` untuk pembatasan percobaan login gagal (10 kali per 15 menit) pada lingkungan serverless.
