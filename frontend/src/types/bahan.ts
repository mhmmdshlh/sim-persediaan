export type StatusStok = "habis" | "menipis" | "aman"

export interface Bahan {
  id_bahan: number
  nama_bahan: string
  id_kategori: number
  nama_kategori: string
  id_satuan: number
  nama_satuan: string
  stok_saat_ini: number
  stok_minimum: number
  harga_terakhir: number
  nilai_persediaan: number
  status: StatusStok
  aktif: boolean
}

export interface BahanPayload {
  nama_bahan: string
  id_kategori: number
  id_satuan: number
  stok_minimum: number
}

export interface BahanFormValues {
  nama_bahan: string
  id_kategori: string
  id_satuan: string
  stok_minimum: string
}