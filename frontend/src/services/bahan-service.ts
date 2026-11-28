import { apiRequest } from "@/services/api"
import type { Bahan, BahanPayload } from "@/types/bahan"

export async function getBahanList(): Promise<Bahan[]> {
  return apiRequest<Bahan[]>("/api/bahan?page=1&page_size=100")
}

export async function createBahan(
  payload: BahanPayload,
): Promise<Bahan> {
  return apiRequest<Bahan>("/api/bahan", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function updateBahan(
  id: number,
  payload: Partial<BahanPayload> & { aktif?: boolean; stok_saat_ini?: number },
): Promise<Bahan> {
  return apiRequest<Bahan>(`/api/bahan/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  })
}

export async function deactivateBahan(id: number): Promise<Bahan> {
  return apiRequest<Bahan>(`/api/bahan/${id}`, {
    method: "DELETE",
  })
}

export function getActiveBahanList(): Promise<Bahan[]> {
  return apiRequest<Bahan[]>("/api/bahan?page=1&page_size=100&aktif=true")
}