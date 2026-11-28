import {
  apiRequest,
  apiRequestWithMeta,
  type PaginationMeta,
} from "@/services/api"
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

export interface TransaksiListResult {
  items: TransaksiResponse[]
  pagination: PaginationMeta
}

export async function getTransaksiList(
  filters: TransaksiQuery = {},
): Promise<TransaksiListResult> {
  const page = filters.page ?? 1
  const pageSize = filters.page_size ?? 25

  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
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

  const res = await apiRequestWithMeta<TransaksiResponse[]>(
    `/api/transaksi?${params.toString()}`,
  )

  return {
    items: res.data,
    pagination: res.pagination ?? {
      page,
      page_size: pageSize,
      total_items: res.data.length,
      total_pages: 1,
    },
  }
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
