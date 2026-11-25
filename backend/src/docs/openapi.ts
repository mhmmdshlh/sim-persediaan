import type { Express } from 'express';

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Sistem Stok Bledek API',
    version: '1.0.0',
    description:
      'REST API Sistem Informasi Manajemen Persediaan untuk Griya Angkringan Sambel Bledek. Seluruh endpoint bisnis memerlukan autentikasi cookie httpOnly atau header Authorization Bearer.',
  },
  servers: [{ url: '/' }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'stok_bledek_session',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              message: { type: 'string' },
              details: { type: 'object' },
            },
            required: ['code', 'message'],
          },
        },
      },
      LoginInput: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string', example: 'pemilik' },
          password: { type: 'string', example: 'bledek123' },
        },
      },
      BahanInput: {
        type: 'object',
        required: ['nama_bahan', 'id_kategori', 'id_satuan', 'stok_minimum'],
        properties: {
          nama_bahan: { type: 'string', example: 'Ayam' },
          id_kategori: { type: 'integer', example: 1 },
          id_satuan: { type: 'integer', example: 1 },
          stok_minimum: { type: 'number', example: 5 },
          aktif: { type: 'boolean', example: true },
        },
      },
      PemasokInput: {
        type: 'object',
        required: ['nama_pemasok'],
        properties: {
          nama_pemasok: { type: 'string', example: 'Agen Ayam Segar Gunungpati' },
          no_telepon: { type: 'string', example: '081220001101' },
          alamat: { type: 'string', example: 'Jl. Raya Gunungpati No. 18, Semarang' },
        },
      },
      TransaksiInput: {
        type: 'object',
        required: ['jenis_transaksi', 'detail'],
        properties: {
          waktu_transaksi: { type: 'string', format: 'date', example: '2026-11-25' },
          jenis_transaksi: { type: 'string', enum: ['masuk', 'keluar'] },
          id_pemasok: { type: 'integer', nullable: true, example: 1 },
          catatan: { type: 'string', example: 'Belanja pagi' },
          detail: {
            type: 'array',
            items: {
              type: 'object',
              required: ['id_bahan', 'jumlah'],
              properties: {
                id_bahan: { type: 'integer', example: 1 },
                jumlah: { type: 'number', example: 5 },
                harga_beli_satuan: { type: 'integer', nullable: true, example: 38000 },
              },
            },
          },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  paths: {
    '/api/health': {
      get: {
        tags: ['System'],
        summary: 'Cek kesehatan server dan database',
        security: [],
        responses: { '200': { description: 'Server dan database terhubung' } },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Masuk ke sistem',
        security: [],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginInput' } } },
        },
        responses: {
          '200': { description: 'Login berhasil, cookie sesi diset dan JWT dikembalikan' },
          '401': { description: 'Kredensial salah' },
          '429': { description: 'Terlalu banyak percobaan gagal' },
        },
      },
    },
    '/api/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Keluar dan hapus cookie sesi',
        security: [],
        responses: { '200': { description: 'Berhasil keluar' } },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Ambil profil pengguna aktif',
        responses: { '200': { description: 'Profil pengguna' }, '401': { description: 'Belum login' } },
      },
    },
    '/api/kategori': {
      get: { tags: ['Master Data'], summary: 'Daftar kategori bahan', responses: { '200': { description: 'Daftar kategori' } } },
      post: { tags: ['Master Data'], summary: 'Tambah kategori bahan', responses: { '201': { description: 'Kategori dibuat' } } },
    },
    '/api/kategori/{id}': {
      patch: { tags: ['Master Data'], summary: 'Ubah kategori bahan', responses: { '200': { description: 'Kategori diperbarui' } } },
      delete: { tags: ['Master Data'], summary: 'Hapus kategori bahan', responses: { '200': { description: 'Kategori dihapus' }, '409': { description: 'Masih dipakai bahan' } } },
    },
    '/api/satuan': {
      get: { tags: ['Master Data'], summary: 'Daftar satuan bahan', responses: { '200': { description: 'Daftar satuan' } } },
      post: { tags: ['Master Data'], summary: 'Tambah satuan bahan', responses: { '201': { description: 'Satuan dibuat' } } },
    },
    '/api/satuan/{id}': {
      patch: { tags: ['Master Data'], summary: 'Ubah satuan bahan', responses: { '200': { description: 'Satuan diperbarui' } } },
      delete: { tags: ['Master Data'], summary: 'Hapus satuan bahan', responses: { '200': { description: 'Satuan dihapus' }, '409': { description: 'Masih dipakai bahan' } } },
    },
    '/api/pemasok': {
      get: { tags: ['Master Data'], summary: 'Daftar pemasok', responses: { '200': { description: 'Daftar pemasok berhalaman' } } },
      post: {
        tags: ['Master Data'],
        summary: 'Tambah pemasok',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/PemasokInput' } } },
        },
        responses: { '201': { description: 'Pemasok dibuat' } },
      },
    },
    '/api/pemasok/{id}': {
      get: { tags: ['Master Data'], summary: 'Detail pemasok', responses: { '200': { description: 'Detail pemasok' } } },
      patch: { tags: ['Master Data'], summary: 'Ubah pemasok', responses: { '200': { description: 'Pemasok diperbarui' } } },
      delete: { tags: ['Master Data'], summary: 'Hapus pemasok', responses: { '200': { description: 'Pemasok dihapus' }, '409': { description: 'Masih dipakai transaksi' } } },
    },
    '/api/bahan': {
      get: { tags: ['Master Data'], summary: 'Daftar bahan beserta saldo dan status stok', responses: { '200': { description: 'Daftar bahan berhalaman' } } },
      post: {
        tags: ['Master Data'],
        summary: 'Tambah bahan baru',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/BahanInput' } } },
        },
        responses: { '201': { description: 'Bahan dibuat' } },
      },
    },
    '/api/bahan/{id}': {
      get: { tags: ['Master Data'], summary: 'Detail bahan', responses: { '200': { description: 'Detail bahan' } } },
      patch: { tags: ['Master Data'], summary: 'Ubah bahan atau aktif/nonaktif', responses: { '200': { description: 'Bahan diperbarui' } } },
      delete: { tags: ['Master Data'], summary: 'Nonaktifkan bahan (soft delete)', responses: { '200': { description: 'Bahan dinonaktifkan' } } },
    },
    '/api/transaksi': {
      get: { tags: ['Transaksi'], summary: 'Riwayat transaksi masuk dan keluar', responses: { '200': { description: 'Daftar transaksi beserta detail bahan' } } },
      post: {
        tags: ['Transaksi'],
        summary: 'Catat transaksi barang masuk atau keluar multi-item',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/TransaksiInput' } } },
        },
        responses: { '201': { description: 'Transaksi tersimpan dan stok diperbarui atomik' }, '422': { description: 'Validasi gagal atau stok tidak cukup' } },
      },
    },
    '/api/transaksi/{id}': {
      get: { tags: ['Transaksi'], summary: 'Detail satu transaksi', responses: { '200': { description: 'Detail transaksi' } } },
      delete: { tags: ['Transaksi'], summary: 'Batalkan transaksi dan kembalikan stok atomik', responses: { '200': { description: 'Transaksi dibatalkan' }, '409': { description: 'Stok sudah terpakai' } } },
    },
    '/api/dashboard': {
      get: {
        tags: ['Dashboard & Laporan'],
        summary: 'Ringkasan harian, daftar stok menipis/habis, dan 5 transaksi terbaru',
        responses: { '200': { description: 'Data dashboard operasional' } },
      },
    },
    '/api/laporan': {
      get: {
        tags: ['Dashboard & Laporan'],
        summary: 'Laporan pemakaian, riwayat harga, perbandingan pemasok, nilai persediaan, dan daftar belanja',
        parameters: [
          { name: 'start_date', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'end_date', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'id_bahan', in: 'query', schema: { type: 'integer' } },
          { name: 'weekend_mode', in: 'query', schema: { type: 'boolean' } },
        ],
        responses: { '200': { description: 'Data laporan persediaan lengkap' } },
      },
    },
  },
};

const SWAGGER_HTML = `<!doctype html>
<html lang="id">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Dokumentasi API - Sistem Stok Bledek</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.onload = function () {
        SwaggerUIBundle({
          url: '/api/openapi.json',
          dom_id: '#swagger-ui',
          persistAuthorization: true
        });
      };
    </script>
  </body>
</html>`;

export function registerDocsRoutes(app: Express): void {
  app.get('/api/openapi.json', (_req, res) => {
    res.json(openApiSpec);
  });

  app.get('/docs', (_req, res) => {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com; style-src 'self' 'unsafe-inline' https://unpkg.com; img-src 'self' data: https://unpkg.com",
    );
    res.type('text/html').send(SWAGGER_HTML);
  });
}
