import {
  SimpleMasterPage,
  type SimpleMasterItem,
} from "@/components/master-data/simple-master-page"

const initialUnits: SimpleMasterItem[] = [
  { id: 1, name: "Kilogram (kg)" },
  { id: 2, name: "Gram (g)" },
  { id: 3, name: "Liter (L)" },
  { id: 4, name: "Buah" },
]

export function SatuanPage() {
  return (
    <SimpleMasterPage
      title="Satuan Bahan"
      description="Kelola satuan pengukuran bahan."
      itemLabel="Satuan"
      initialItems={initialUnits}
    />
  )
}