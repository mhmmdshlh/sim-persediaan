import { SimpleMasterPage } from "@/components/master-data/simple-master-page"
import {
  createKategori,
  deleteKategori,
  getKategoriList,
  updateKategori,
} from "@/services/kategori-service"

export function KategoriPage() {
  return (
    <SimpleMasterPage
      title="Kategori Bahan"
      description="Kelola kategori pengelompokan bahan."
      itemLabel="Kategori"
      loadItems={getKategoriList}
      createItem={createKategori}
      updateItem={updateKategori}
      deleteItem={deleteKategori}
    />
  )
}