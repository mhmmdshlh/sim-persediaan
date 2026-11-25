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