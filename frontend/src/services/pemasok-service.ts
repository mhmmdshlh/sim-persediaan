import { apiRequest } from "@/services/api"
import type { Pemasok, PemasokFormValues } from "@/types/pemasok"

export function getPemasokList(search = ""): Promise<Pemasok[]> {
  const params = new URLSearchParams({
    page: "1",
    page_size: "100",
  })

  const query = search.trim()

  if (query) {
    params.set("search", query)
  }

  return apiRequest<Pemasok[]>(`/api/pemasok?${params.toString()}`)
}

export function createPemasok(
  payload: PemasokFormValues,
): Promise<Pemasok> {
  return apiRequest<Pemasok>("/api/pemasok", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export function updatePemasok(
  id: number,
  payload: PemasokFormValues,
): Promise<Pemasok> {
  return apiRequest<Pemasok>(`/api/pemasok/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  })
}

export async function deletePemasok(id: number): Promise<void> {
  await apiRequest<{ deleted: boolean; id_pemasok: number }>(
    `/api/pemasok/${id}`,
    { method: "DELETE" },
  )
}
