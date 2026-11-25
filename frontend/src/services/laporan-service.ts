import { apiRequest } from "@/services/api"
import type {
  LaporanFilters,
  LaporanResponse,
} from "@/types/laporan"

export function getLaporan(
  filters: LaporanFilters = {},
): Promise<LaporanResponse> {
  const params = new URLSearchParams()

  if (filters.start_date) {
    params.set("start_date", filters.start_date)
  }

  if (filters.end_date) {
    params.set("end_date", filters.end_date)
  }

  if (filters.id_bahan !== undefined) {
    params.set("id_bahan", String(filters.id_bahan))
  }

  if (filters.weekend_mode !== undefined) {
    params.set("weekend_mode", String(filters.weekend_mode))
  }

  const query = params.toString()
  const path = query ? `/api/laporan?${query}` : "/api/laporan"

  return apiRequest<LaporanResponse>(path)
}
