
export interface LaporanFilters {
  start_date?: string
  end_date?: string
  id_bahan?: number
  weekend_mode?: boolean
}

export interface LaporanUsageItem {
  id_bahan: number
  nama_bahan: string
  satuan: string
  total_jumlah: number
  jumlah_transaksi: number
  estimasi_biaya: number
}

export interface LaporanPriceHistoryItem {
  id: string
  tanggal: string
  id_bahan: number
  nama_bahan: string
  id_pemasok: number | null
  nama_pemasok: string | null
  jumlah: number
  satuan: string
  harga_beli_satuan: number
  subtotal: number
}

export interface LaporanPriceSupplier {
  id_pemasok: number
  nama_pemasok: string
  harga_rata_rata: number
  harga_terendah: number
  harga_tertinggi: number
  harga_terakhir: number
  jumlah_transaksi: number
}

export interface LaporanPriceSummary {
  id_bahan: number
  nama_bahan: string
  satuan: string
  harga_terendah: number
  harga_tertinggi: number
  harga_rata_rata: number
  harga_terakhir: number
  jumlah_pembelian: number
  perbandingan_pemasok: LaporanPriceSupplier[]
}

export interface LaporanInventoryItem {
  id_bahan: number
  nama_bahan: string
  nama_kategori: string
  satuan: string
  stok_saat_ini: number
  harga_terakhir: number
  nilai_persediaan: number
}

export interface LaporanInventoryCategory {
  id_kategori: number
  nama_kategori: string
  total_nilai: number
  jumlah_bahan: number
}

export interface LaporanShoppingItem {
  id_bahan: number
  nama_bahan: string
  satuan: string
  stok_saat_ini: number
  stok_minimum: number
  saran_jumlah_beli: number
  harga_terakhir: number
  estimasi_biaya: number
  pemasok_terakhir: {
    id_pemasok: number
    nama_pemasok: string
    no_telepon: string
  } | null
}

export interface LaporanResponse {
  periode: {
    start_date: string | null
    end_date: string | null
  }

  ringkasan: {
    total_transaksi_masuk: number
    total_transaksi_keluar: number
    jenis_bahan_digunakan: number
    total_pengeluaran_pembelian: number
    total_estimasi_pemakaian: number
    total_nilai_persediaan: number
  }

  pemakaian_bahan: LaporanUsageItem[]
  riwayat_harga: LaporanPriceHistoryItem[]
  ringkasan_harga_bahan: LaporanPriceSummary[]

  nilai_persediaan: {
    metode_penilaian: "HARGA_BELI_TERAKHIR"
    keterangan: string
    total_nilai: number
    per_kategori: LaporanInventoryCategory[]
    items: LaporanInventoryItem[]
  }

  daftar_belanja: {
    weekend_mode: boolean
    alasan: string
    estimasi_total_biaya: number
    items: LaporanShoppingItem[]
  }
}
