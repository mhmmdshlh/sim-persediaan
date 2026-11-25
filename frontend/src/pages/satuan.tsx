import { SimpleMasterPage } from "@/components/master-data/simple-master-page"
import {
  createSatuan,
  deleteSatuan,
  getSatuanList,
  updateSatuan,
} from "@/services/satuan-service"

export function SatuanPage() {
  return (
    <SimpleMasterPage
      title="Satuan Bahan"
      description="Kelola satuan pengukuran bahan."
      itemLabel="Satuan"
      loadItems={getSatuanList}
      createItem={createSatuan}
      updateItem={updateSatuan}
      deleteItem={deleteSatuan}
    />
  )
}