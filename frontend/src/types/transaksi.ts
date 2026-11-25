export type JenisTransaksi = "masuk" | "keluar"

export interface DetailTransaksiDraft {
  id_bahan: number
  jumlah: number
  harga_beli_satuan: number | null
}

export interface TransaksiDraft {
  waktu_transaksi: string
  jenis_transaksi: JenisTransaksi
  id_pemasok: number | null
  catatan: string
  detail: DetailTransaksiDraft[]
}

export interface DetailTransaksiResponse {
  id_bahan: number
  nama_bahan: string
  satuan: string
  jumlah: number
  harga_beli_satuan: number | null
  subtotal: number
}

export interface TransaksiResponse {
  id_transaksi: string
  waktu_transaksi: string
  jenis_transaksi: JenisTransaksi
  id_pemasok: number | null
  nama_pemasok: string | null
  catatan: string
  created_at: string
  total_pembelian: number
  detail: DetailTransaksiResponse[]
}