export interface DashboardSummary {
  total_bahan_aktif: number
  stok_menipis: number
  stok_habis: number
  barang_masuk_hari_ini: number
  barang_keluar_hari_ini: number
}

export interface DashboardStockItem {
  id_bahan: number
  nama_bahan: string
  satuan: string
  stok_saat_ini: number
  stok_minimum: number
  status: "habis" | "menipis"
}

export interface DashboardTransaction {
  id_transaksi: string
  waktu_transaksi: string
  jenis_transaksi: "masuk" | "keluar"
  catatan: string
  nama_pemasok: string | null
  jumlah_jenis_bahan: number
  total_pembelian: number
}

export interface DashboardResponse {
  tanggal_wib: string
  is_pre_weekend: boolean
  ringkasan: DashboardSummary
  stok_menipis: DashboardStockItem[]
  transaksi_terbaru: DashboardTransaction[]
}
