import {
  SimpleMasterPage,
  type SimpleMasterItem,
} from "@/components/master-data/simple-master-page"

const initialCategories: SimpleMasterItem[] = [
  { id: 1, name: "Bahan Utama" },
  { id: 2, name: "Bumbu" },
  { id: 3, name: "Bahan Kemasan" },
]

export function KategoriPage() {
  return (
    <SimpleMasterPage
      title="Kategori Bahan"
      description="Kelola kategori pengelompokan bahan."
      itemLabel="Kategori"
      initialItems={initialCategories}
    />
  )
}