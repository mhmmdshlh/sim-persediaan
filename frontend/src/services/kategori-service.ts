import { apiRequest } from "@/services/api"
import type { Kategori, MasterDataItem } from "@/types/master-data"

function mapKategori(kategori: Kategori): MasterDataItem {
  return {
    id: kategori.id_kategori,
    name: kategori.nama_kategori,
  }
}

export async function getKategoriList(): Promise<MasterDataItem[]> {
  const data = await apiRequest<Kategori[]>("/api/kategori")
  return data.map(mapKategori)
}

export async function createKategori(
  nama: string,
): Promise<MasterDataItem> {
  const data = await apiRequest<Kategori>("/api/kategori", {
    method: "POST",
    body: JSON.stringify({ nama_kategori: nama }),
  })

  return mapKategori(data)
}

export async function updateKategori(
  id: number,
  nama: string,
): Promise<MasterDataItem> {
  const data = await apiRequest<Kategori>(`/api/kategori/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ nama_kategori: nama }),
  })

  return mapKategori(data)
}

export async function deleteKategori(id: number): Promise<void> {
  await apiRequest<{ deleted: boolean; id_kategori: number }>(
    `/api/kategori/${id}`,
    { method: "DELETE" },
  )
}