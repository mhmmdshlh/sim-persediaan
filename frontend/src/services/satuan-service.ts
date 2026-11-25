import { apiRequest } from "@/services/api"
import type { MasterDataItem, Satuan } from "@/types/master-data"

function mapSatuan(satuan: Satuan): MasterDataItem {
  return {
    id: satuan.id_satuan,
    name: satuan.nama_satuan,
  }
}

export async function getSatuanList(): Promise<MasterDataItem[]> {
  const data = await apiRequest<Satuan[]>("/api/satuan")
  return data.map(mapSatuan)
}

export async function createSatuan(
  nama: string,
): Promise<MasterDataItem> {
  const data = await apiRequest<Satuan>("/api/satuan", {
    method: "POST",
    body: JSON.stringify({ nama_satuan: nama }),
  })

  return mapSatuan(data)
}

export async function updateSatuan(
  id: number,
  nama: string,
): Promise<MasterDataItem> {
  const data = await apiRequest<Satuan>(`/api/satuan/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ nama_satuan: nama }),
  })

  return mapSatuan(data)
}

export async function deleteSatuan(id: number): Promise<void> {
  await apiRequest<{ deleted: boolean; id_satuan: number }>(
    `/api/satuan/${id}`,
    { method: "DELETE" },
  )
}