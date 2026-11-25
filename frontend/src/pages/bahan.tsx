
import { useState, type FormEvent } from "react"
import { Pencil, Plus, Search } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import type { Bahan, BahanFormValues } from "@/types/bahan"

const KATEGORI = [
  { id: 1, nama: "Bahan utama" },
  { id: 2, nama: "Bumbu" },
  { id: 3, nama: "Bahan kemasan" },
]

const SATUAN = [
  { id: 1, nama: "kg" },
  { id: 2, nama: "gram" },
  { id: 3, nama: "liter" },
  { id: 4, nama: "buah" },
]

const INITIAL_BAHAN: Bahan[] = [
  {
    id_bahan: 1,
    nama_bahan: "Ayam",
    id_kategori: 1,
    id_satuan: 1,
    stok_minimum: 5,
    aktif: true,
  },
  {
    id_bahan: 2,
    nama_bahan: "Telur",
    id_kategori: 1,
    id_satuan: 1,
    stok_minimum: 2,
    aktif: true,
  },
  {
    id_bahan: 3,
    nama_bahan: "Cabai",
    id_kategori: 2,
    id_satuan: 1,
    stok_minimum: 1,
    aktif: true,
  },
  {
    id_bahan: 4,
    nama_bahan: "Minyak Goreng",
    id_kategori: 1,
    id_satuan: 3,
    stok_minimum: 2,
    aktif: true,
  },
  {
    id_bahan: 5,
    nama_bahan: "Lunch Box",
    id_kategori: 3,
    id_satuan: 4,
    stok_minimum: 50,
    aktif: true,
  },
]

const EMPTY_FORM: BahanFormValues = {
  nama_bahan: "",
  id_kategori: "",
  id_satuan: "",
  stok_minimum: "",
}

const kategoriItems = KATEGORI.map((kategori) => ({
  label: kategori.nama,
  value: String(kategori.id),
}))

const satuanItems = SATUAN.map((satuan) => ({
  label: satuan.nama,
  value: String(satuan.id),
}))

export function BahanPage() {
  const [bahanList, setBahanList] = useState<Bahan[]>(INITIAL_BAHAN)
  const [searchQuery, setSearchQuery] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<BahanFormValues>({ ...EMPTY_FORM })

  const filteredBahan = bahanList.filter((bahan) =>
    bahan.nama_bahan.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  function getKategoriName(id: number) {
    return KATEGORI.find((kategori) => kategori.id === id)?.nama ?? "-"
  }

  function getSatuanName(id: number) {
    return SATUAN.find((satuan) => satuan.id === id)?.nama ?? "-"
  }

  function openCreateDialog() {
    setEditingId(null)
    setForm({ ...EMPTY_FORM })
    setDialogOpen(true)
  }

  function openEditDialog(bahan: Bahan) {
    setEditingId(bahan.id_bahan)

    setForm({
      nama_bahan: bahan.nama_bahan,
      id_kategori: String(bahan.id_kategori),
      id_satuan: String(bahan.id_satuan),
      stok_minimum: String(bahan.stok_minimum),
    })

    setDialogOpen(true)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const namaBahan = form.nama_bahan.trim()
    const stokMinimum = Number(form.stok_minimum)

    if (
      !namaBahan ||
      !form.id_kategori ||
      !form.id_satuan ||
      form.stok_minimum.trim() === "" ||
      !Number.isFinite(stokMinimum) ||
      stokMinimum < 0
    ) {
      return
    }

    const payload = {
      nama_bahan: namaBahan,
      id_kategori: Number(form.id_kategori),
      id_satuan: Number(form.id_satuan),
      stok_minimum: stokMinimum,
    }

    if (editingId !== null) {
      setBahanList((current) =>
        current.map((bahan) =>
          bahan.id_bahan === editingId
            ? { ...bahan, ...payload }
            : bahan,
        ),
      )
    } else {
      setBahanList((current) => {
        const nextId =
          current.reduce(
            (maximum, bahan) => Math.max(maximum, bahan.id_bahan),
            0,
          ) + 1

        return [
          ...current,
          {
            id_bahan: nextId,
            ...payload,
            aktif: true,
          },
        ]
      })
    }

    setDialogOpen(false)
    setEditingId(null)
    setForm({ ...EMPTY_FORM })
  }

  function toggleActive(id: number) {
    setBahanList((current) =>
      current.map((bahan) =>
        bahan.id_bahan === id
          ? { ...bahan, aktif: !bahan.aktif }
          : bahan,
      ),
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Heading */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Data Bahan
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kelola daftar bahan baku dan bahan kemasan.
        </p>
      </div>

      {/* Table Container */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          {/* Search and Add Button */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                placeholder="Cari nama bahan..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-9"
              />
            </div>

            <Button onClick={openCreateDialog}>
              <Plus className="size-4" />
              Tambah Bahan
            </Button>
          </div>

          {/* Data Table */}
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Bahan</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Satuan</TableHead>
                  <TableHead>Stok Minimum</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredBahan.length > 0 ? (
                  filteredBahan.map((bahan) => (
                    <TableRow key={bahan.id_bahan}>
                      <TableCell className="font-medium">
                        {bahan.nama_bahan}
                      </TableCell>

                      <TableCell>
                        {getKategoriName(bahan.id_kategori)}
                      </TableCell>

                      <TableCell>
                        {getSatuanName(bahan.id_satuan)}
                      </TableCell>

                      <TableCell>
                        {bahan.stok_minimum}
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant={bahan.aktif ? "default" : "secondary"}
                        >
                          {bahan.aktif ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Edit ${bahan.nama_bahan}`}
                            onClick={() => openEditDialog(bahan)}
                          >
                            <Pencil className="size-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleActive(bahan.id_bahan)}
                          >
                            {bahan.aktif ? "Nonaktifkan" : "Aktifkan"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Tidak ada bahan ditemukan.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <p className="text-xs text-muted-foreground">
            Menampilkan {filteredBahan.length} dari {bahanList.length} bahan.
          </p>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>
              {editingId !== null ? "Edit Bahan" : "Tambah Bahan"}
            </DialogTitle>

            <DialogDescription>
              Isi informasi bahan yang akan disimpan.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="nama_bahan" className="text-sm font-medium">
                Nama Bahan
              </label>

              <Input
                id="nama_bahan"
                value={form.nama_bahan}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    nama_bahan: event.target.value,
                  }))
                }
                placeholder="Contoh: Ayam"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="kategori" className="text-sm font-medium">
                Kategori
              </label>

              <Select
                value={form.id_kategori}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    id_kategori: value ?? "",
                  }))
                }
                items={kategoriItems}
              >
                <SelectTrigger id="kategori" className="w-full">
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>

                <SelectContent>
                  <SelectGroup>
                    {kategoriItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="satuan" className="text-sm font-medium">
                Satuan
              </label>

              <Select
                value={form.id_satuan}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    id_satuan: value ?? "",
                  }))
                }
                items={satuanItems}
              >
                <SelectTrigger id="satuan" className="w-full">
                  <SelectValue placeholder="Pilih satuan" />
                </SelectTrigger>

                <SelectContent>
                  <SelectGroup>
                    {satuanItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="stok_minimum" className="text-sm font-medium">
                Stok Minimum
              </label>

              <Input
                id="stok_minimum"
                type="number"
                min="0"
                step="any"
                value={form.stok_minimum}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    stok_minimum: event.target.value,
                  }))
                }
                placeholder="Contoh: 5"
                required
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Batal
              </Button>

              <Button type="submit">
                {editingId !== null ? "Simpan Perubahan" : "Simpan Bahan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
