import { apiRequest } from "@/services/api"
import type {
  JenisTransaksi,
  TransaksiDraft,
  TransaksiResponse,
} from "@/types/transaksi"

interface TransaksiQuery {
  page?: number
  page_size?: number
  jenis_transaksi?: JenisTransaksi
  id_pemasok?: number
  id_bahan?: number
  start_date?: string
  end_date?: string
  search?: string
}

export function getTransaksiList(
  filters: TransaksiQuery = {},
): Promise<TransaksiResponse[]> {
  const params = new URLSearchParams({
    page: String(filters.page ?? 1),
    page_size: String(filters.page_size ?? 100),
  })

  if (filters.jenis_transaksi) {
    params.set("jenis_transaksi", filters.jenis_transaksi)
  }

  if (filters.id_pemasok !== undefined) {
    params.set("id_pemasok", String(filters.id_pemasok))
  }

  if (filters.id_bahan !== undefined) {
    params.set("id_bahan", String(filters.id_bahan))
  }

  if (filters.start_date) {
    params.set("start_date", filters.start_date)
  }

  if (filters.end_date) {
    params.set("end_date", filters.end_date)
  }

  if (filters.search?.trim()) {
    params.set("search", filters.search.trim())
  }

  return apiRequest<TransaksiResponse[]>(
    `/api/transaksi?${params.toString()}`,
  )
}

export function getTransaksiById(
  id: string,
): Promise<TransaksiResponse> {
  return apiRequest<TransaksiResponse>(`/api/transaksi/${id}`)
}

export function createTransaksi(
  payload: TransaksiDraft,
): Promise<TransaksiResponse> {
  return apiRequest<TransaksiResponse>("/api/transaksi", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function deleteTransaksi(id: string): Promise<void> {
  await apiRequest<{ deleted: boolean; id_transaksi: string }>(
    `/api/transaksi/${id}`,
    {
      method: "DELETE",
    },
  )
}