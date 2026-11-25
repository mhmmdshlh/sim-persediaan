
import { useEffect, useState, type SubmitEvent } from "react"
import { Pencil, Plus, Search, Trash2 } from "lucide-react"

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

import { ApiError } from "@/services/api"
import {
  createPemasok,
  deletePemasok,
  getPemasokList,
  updatePemasok,
} from "@/services/pemasok-service"

import type { Pemasok, PemasokFormValues } from "@/types/pemasok"

const EMPTY_FORM: PemasokFormValues = {
  nama_pemasok: "",
  no_telepon: "",
  alamat: "",
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message
  }

  return "Tidak dapat terhubung ke server. Periksa koneksi dan coba lagi."
}

function matchesSearch(pemasok: Pemasok, search: string): boolean {
  const query = search.trim().toLowerCase()

  if (!query) return true

  return (
    pemasok.nama_pemasok.toLowerCase().includes(query) ||
    pemasok.no_telepon.toLowerCase().includes(query) ||
    pemasok.alamat.toLowerCase().includes(query)
  )
}

export function PemasokPage() {
  const [pemasokList, setPemasokList] = useState<Pemasok[]>([])
  const [search, setSearch] = useState("")
  const [loadedSearch, setLoadedSearch] = useState<string | null>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<PemasokFormValues>({ ...EMPTY_FORM })

  const [formError, setFormError] = useState("")
  const [pageError, setPageError] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const isLoading = loadedSearch !== search

  // Mengambil data dari backend setiap kali kata pencarian berubah.
  useEffect(() => {
    let isActive = true

    getPemasokList(search)
      .then((data) => {
        if (!isActive) return

        setPemasokList(data)
        setPageError("")
        setLoadedSearch(search)
      })
      .catch((error: unknown) => {
        if (!isActive) return

        setPemasokList([])
        setPageError(getErrorMessage(error))
        setLoadedSearch(search)
      })

    return () => {
      isActive = false
    }
  }, [search])

  function openCreateDialog() {
    setEditingId(null)
    setForm({ ...EMPTY_FORM })
    setFormError("")
    setDialogOpen(true)
  }

  function openEditDialog(pemasok: Pemasok) {
    setEditingId(pemasok.id_pemasok)

    setForm({
      nama_pemasok: pemasok.nama_pemasok,
      no_telepon: pemasok.no_telepon,
      alamat: pemasok.alamat,
    })

    setFormError("")
    setDialogOpen(true)
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()

    const payload: PemasokFormValues = {
      nama_pemasok: form.nama_pemasok.trim(),
      no_telepon: form.no_telepon.trim(),
      alamat: form.alamat.trim(),
    }

    if (!payload.nama_pemasok) {
      setFormError("Nama pemasok wajib diisi.")
      return
    }

    setIsSaving(true)
    setFormError("")

    try {
      if (editingId !== null) {
        const updated = await updatePemasok(editingId, payload)

        setPemasokList((current) => {
          const remaining = current.filter(
            (item) => item.id_pemasok !== updated.id_pemasok,
          )

          if (!matchesSearch(updated, search)) {
            return remaining
          }

          return [...remaining, updated].sort(
            (a, b) => a.id_pemasok - b.id_pemasok,
          )
        })
      } else {
        const created = await createPemasok(payload)

        setPemasokList((current) => {
          if (!matchesSearch(created, search)) {
            return current
          }

          return [...current, created].sort(
            (a, b) => a.id_pemasok - b.id_pemasok,
          )
        })
      }

      setDialogOpen(false)
      setEditingId(null)
      setForm({ ...EMPTY_FORM })
    } catch (error: unknown) {
      setFormError(getErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(pemasok: Pemasok) {
    const confirmed = window.confirm(
      `Hapus pemasok "${pemasok.nama_pemasok}"?`,
    )

    if (!confirmed) return

    setPageError("")
    setDeletingId(pemasok.id_pemasok)

    try {
      await deletePemasok(pemasok.id_pemasok)

      setPemasokList((current) =>
        current.filter(
          (item) => item.id_pemasok !== pemasok.id_pemasok,
        ),
      )
    } catch (error: unknown) {
      setPageError(getErrorMessage(error))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Data Pemasok
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Kelola informasi pemasok bahan baku dan bahan kemasan.
        </p>
      </div>

      {pageError && (
        <div
          className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {pageError}
        </div>
      )}

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPageError("")
                }}
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
                {isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Memuat data pemasok...
                    </TableCell>
                  </TableRow>
                ) : pemasokList.length > 0 ? (
                  pemasokList.map((pemasok) => (
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
                            disabled={deletingId !== null}
                          >
                            <Pencil className="size-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Hapus ${pemasok.nama_pemasok}`}
                            onClick={() => handleDelete(pemasok)}
                            disabled={deletingId !== null}
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
                      {pageError
                        ? "Data pemasok tidak dapat dimuat."
                        : search.trim()
                          ? "Tidak ada pemasok yang cocok dengan pencarian."
                          : "Belum ada data pemasok."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <p className="text-xs text-muted-foreground">
            Menampilkan {pemasokList.length} pemasok.
          </p>
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!isSaving) setDialogOpen(open)
        }}
      >
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
              <label
                htmlFor="nama_pemasok"
                className="text-sm font-medium"
              >
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
                  setFormError("")
                }}
                placeholder="Masukkan nama pemasok"
                maxLength={120}
                required
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="no_telepon"
                className="text-sm font-medium"
              >
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
                maxLength={30}
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="alamat"
                className="text-sm font-medium"
              >
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
                maxLength={500}
                className="w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
              />
            </div>

            {formError && (
              <p className="text-sm text-destructive" role="alert">
                {formError}
              </p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={isSaving}
              >
                Batal
              </Button>

              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
