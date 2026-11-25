export interface Bahan {
  id_bahan: number
  nama_bahan: string
  id_kategori: number
  id_satuan: number
  stok_minimum: number
  aktif: boolean
}

export interface BahanFormValues {
  nama_bahan: string
  id_kategori: string
  id_satuan: string
  stok_minimum: string
}