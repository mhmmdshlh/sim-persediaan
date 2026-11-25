
import { useState, type SubmitEvent} from "react"
import { Pencil, Plus, Search, Trash2 } from "lucide-react"

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import type { Pemasok, PemasokFormValues } from "@/types/pemasok"

const INITIAL_PEMASOK: Pemasok[] = [
  {
    id_pemasok: 1,
    nama_pemasok: "Pemasok Contoh",
    no_telepon: "08xxxxxxxxxx",
    alamat: "Alamat contoh, Semarang",
  },
]

const EMPTY_FORM: PemasokFormValues = {
  nama_pemasok: "",
  no_telepon: "",
  alamat: "",
}

export function PemasokPage() {
  const [pemasokList, setPemasokList] =
    useState<Pemasok[]>(INITIAL_PEMASOK)

  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<PemasokFormValues>({ ...EMPTY_FORM })
  const [error, setError] = useState("")

  const filteredPemasok = pemasokList.filter((pemasok) => {
    const query = search.toLowerCase()

    return (
      pemasok.nama_pemasok.toLowerCase().includes(query) ||
      pemasok.no_telepon.toLowerCase().includes(query) ||
      pemasok.alamat.toLowerCase().includes(query)
    )
  })

  function openCreateDialog() {
    setEditingId(null)
    setForm({ ...EMPTY_FORM })
    setError("")
    setDialogOpen(true)
  }

  function openEditDialog(pemasok: Pemasok) {
    setEditingId(pemasok.id_pemasok)

    setForm({
      nama_pemasok: pemasok.nama_pemasok,
      no_telepon: pemasok.no_telepon,
      alamat: pemasok.alamat,
    })

    setError("")
    setDialogOpen(true)
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()

    const namaPemasok = form.nama_pemasok.trim()

    if (!namaPemasok) {
      setError("Nama pemasok wajib diisi.")
      return
    }

    const duplicate = pemasokList.some(
      (pemasok) =>
        pemasok.id_pemasok !== editingId &&
        pemasok.nama_pemasok.toLowerCase() === namaPemasok.toLowerCase(),
    )

    if (duplicate) {
      setError("Nama pemasok sudah terdaftar.")
      return
    }

    const payload: PemasokFormValues = {
      nama_pemasok: namaPemasok,
      no_telepon: form.no_telepon.trim(),
      alamat: form.alamat.trim(),
    }

    if (editingId !== null) {
      setPemasokList((current) =>
        current.map((pemasok) =>
          pemasok.id_pemasok === editingId
            ? { ...pemasok, ...payload }
            : pemasok,
        ),
      )
    } else {
      setPemasokList((current) => {
        const nextId =
          current.reduce(
            (maximum, pemasok) =>
              Math.max(maximum, pemasok.id_pemasok),
            0,
          ) + 1

        return [
          ...current,
          {
            id_pemasok: nextId,
            ...payload,
          },
        ]
      })
    }

    setDialogOpen(false)
    setEditingId(null)
    setForm({ ...EMPTY_FORM })
  }

  function handleDelete(pemasok: Pemasok) {
    const confirmed = window.confirm(
      `Hapus pemasok "${pemasok.nama_pemasok}"?`,
    )

    if (!confirmed) return

    setPemasokList((current) =>
      current.filter(
        (item) => item.id_pemasok !== pemasok.id_pemasok,
      ),
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold tracking-tight">
          Data Pemasok
        </h1>

        <Badge variant="outline">Data contoh</Badge>
      </div>

      <p className="text-sm text-muted-foreground">
        Kelola informasi pemasok bahan baku dan bahan kemasan.
      </p>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari pemasok..."
                className="pl-9"
              />
            </div>

            <Button onClick={openCreateDialog}>
              <Plus className="size-4" />
              Tambah Pemasok
            </Button>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Pemasok</TableHead>
                  <TableHead>Nomor Telepon</TableHead>
                  <TableHead>Alamat</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredPemasok.length > 0 ? (
                  filteredPemasok.map((pemasok) => (
                    <TableRow key={pemasok.id_pemasok}>
                      <TableCell className="font-medium">
                        {pemasok.nama_pemasok}
                      </TableCell>

                      <TableCell className="whitespace-nowrap">
                        {pemasok.no_telepon || "-"}
                      </TableCell>

                      <TableCell className="min-w-48">
                        {pemasok.alamat || "-"}
                      </TableCell>

                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Edit ${pemasok.nama_pemasok}`}
                            onClick={() => openEditDialog(pemasok)}
                          >
                            <Pencil className="size-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Hapus ${pemasok.nama_pemasok}`}
                            onClick={() => handleDelete(pemasok)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Tidak ada pemasok ditemukan.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <p className="text-xs text-muted-foreground">
            Menampilkan {filteredPemasok.length} dari {pemasokList.length} pemasok.
          </p>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId !== null ? "Edit Pemasok" : "Tambah Pemasok"}
            </DialogTitle>

            <DialogDescription>
              Masukkan informasi pemasok.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="nama_pemasok" className="text-sm font-medium">
                Nama Pemasok
              </label>

              <Input
                id="nama_pemasok"
                value={form.nama_pemasok}
                onChange={(event) => {
                  setForm((current) => ({
                    ...current,
                    nama_pemasok: event.target.value,
                  }))
                  setError("")
                }}
                placeholder="Masukkan nama pemasok"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="no_telepon" className="text-sm font-medium">
                Nomor Telepon
              </label>

              <Input
                id="no_telepon"
                type="tel"
                value={form.no_telepon}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    no_telepon: event.target.value,
                  }))
                }
                placeholder="Masukkan nomor telepon"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="alamat" className="text-sm font-medium">
                Alamat
              </label>

              <textarea
                id="alamat"
                value={form.alamat}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    alamat: event.target.value,
                  }))
                }
                placeholder="Masukkan alamat pemasok"
                rows={3}
                className="w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Batal
              </Button>

              <Button type="submit">
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
