import { useRef, useState, type SubmitEvent } from "react"
import { Plus, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import type {
  JenisTransaksi,
  TransaksiDraft,
} from "@/types/transaksi"

interface TransaksiFormProps {
  mode: JenisTransaksi
}

interface DetailFormState {
  rowId: number
  id_bahan: string
  jumlah: string
  harga_beli_satuan: string
}

const BAHAN_OPTIONS = [
  { id: 1, nama: "Ayam", satuan: "kg", stokSaatIni: 3 },
  { id: 2, nama: "Telur", satuan: "kg", stokSaatIni: 8 },
  { id: 3, nama: "Cabai", satuan: "kg", stokSaatIni: 1 },
  { id: 4, nama: "Minyak Goreng", satuan: "liter", stokSaatIni: 4 },
  { id: 5, nama: "Lunch Box", satuan: "buah", stokSaatIni: 120 },
]

const PEMASOK_OPTIONS = [
  { id: 1, nama: "Pemasok Contoh 1" },
  { id: 2, nama: "Pemasok Contoh 2" },
]

const BAHAN_ITEMS = BAHAN_OPTIONS.map((bahan) => ({
  label: `${bahan.nama} (${bahan.satuan})`,
  value: String(bahan.id),
}))

const PEMASOK_ITEMS = PEMASOK_OPTIONS.map((pemasok) => ({
  label: pemasok.nama,
  value: String(pemasok.id),
}))

export function TransaksiForm({ mode }: TransaksiFormProps) {
  const isMasuk = mode === "masuk"

  const nextRowId = useRef(2)

  const [tanggal, setTanggal] = useState("")
  const [idPemasok, setIdPemasok] = useState("")
  const [catatan, setCatatan] = useState("")
  const [items, setItems] = useState<DetailFormState[]>([
    {
      rowId: 1,
      id_bahan: "",
      jumlah: "",
      harga_beli_satuan: "",
    },
  ])

  const [error, setError] = useState("")
  const [lastSubmission, setLastSubmission] =
    useState<TransaksiDraft | null>(null)

  const title = isMasuk ? "Barang Masuk" : "Barang Keluar"

  function updateDetail(
    rowId: number,
    changes: Partial<Omit<DetailFormState, "rowId">>,
  ) {
    setItems((current) =>
      current.map((item) =>
        item.rowId === rowId
          ? { ...item, ...changes }
          : item,
      ),
    )
    setError("")
    setLastSubmission(null)
  }

  function addDetail() {
    const rowId = nextRowId.current
    nextRowId.current += 1

    setItems((current) => [
      ...current,
      {
        rowId,
        id_bahan: "",
        jumlah: "",
        harga_beli_satuan: "",
      },
    ])

    setError("")
    setLastSubmission(null)
  }

  function removeDetail(rowId: number) {
    setItems((current) =>
      current.filter((item) => item.rowId !== rowId),
    )
    setError("")
    setLastSubmission(null)
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setLastSubmission(null)

    if (!tanggal) {
      setError("Tanggal transaksi wajib diisi.")
      return
    }

    if (isMasuk && !idPemasok) {
      setError("Pemasok wajib dipilih.")
      return
    }

    if (
      items.some(
        (item) =>
          !item.id_bahan ||
          !item.jumlah.trim() ||
          (isMasuk && !item.harga_beli_satuan.trim()),
      )
    ) {
      setError("Semua informasi detail bahan wajib diisi.")
      return
    }

    const selectedIds = items.map((item) =>
      Number(item.id_bahan),
    )

    if (new Set(selectedIds).size !== selectedIds.length) {
      setError("Bahan yang sama tidak boleh dimasukkan dua kali.")
      return
    }

    const details = items.map((item) => ({
      id_bahan: Number(item.id_bahan),
      jumlah: Number(item.jumlah),
      harga_beli_satuan: isMasuk
        ? Number(item.harga_beli_satuan)
        : null,
    }))

    const invalidQuantity = details.some(
      (item) =>
        !Number.isFinite(item.jumlah) ||
        item.jumlah <= 0,
    )

    if (invalidQuantity) {
      setError("Jumlah bahan harus lebih besar dari nol.")
      return
    }

    if (
      isMasuk &&
      details.some(
        (item) =>
          item.harga_beli_satuan === null ||
          !Number.isFinite(item.harga_beli_satuan) ||
          item.harga_beli_satuan <= 0,
      )
    ) {
      setError("Harga beli harus lebih besar dari nol.")
      return
    }

    if (!isMasuk) {
      const insufficientStock = details.find((detail) => {
        const bahan = BAHAN_OPTIONS.find(
          (option) => option.id === detail.id_bahan,
        )

        return bahan && detail.jumlah > bahan.stokSaatIni
      })

      if (insufficientStock) {
        const bahan = BAHAN_OPTIONS.find(
          (option) => option.id === insufficientStock.id_bahan,
        )

        setError(
          `Stok ${bahan?.nama ?? "bahan"} tidak mencukupi. ` +
          `Stok tersedia: ${bahan?.stokSaatIni} ${bahan?.satuan}.`,
        )
        return
      }
    }

    const payload: TransaksiDraft = {
      waktu_transaksi: tanggal,
      jenis_transaksi: mode,
      id_pemasok: isMasuk ? Number(idPemasok) : null,
      catatan: catatan.trim(),
      detail: details,
    }

    setLastSubmission(payload)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {title}
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          {isMasuk
            ? "Catat pembelian dan penerimaan bahan."
            : "Catat penggunaan bahan untuk produksi."}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informasi Transaksi</CardTitle>
          <CardDescription>
            Lengkapi informasi transaksi dan detail bahan.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* General Information */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="tanggal" className="text-sm font-medium">
                  Tanggal Transaksi
                </label>

                <Input
                  id="tanggal"
                  type="date"
                  value={tanggal}
                  onChange={(event) => {
                    setTanggal(event.target.value)
                    setError("")
                    setLastSubmission(null)
                  }}
                  required
                />
              </div>

              {isMasuk && (
                <div className="space-y-2">
                  <label htmlFor="pemasok" className="text-sm font-medium">
                    Pemasok
                  </label>

                  <Select
                    value={idPemasok}
                    onValueChange={(value) => {
                      setIdPemasok(value ?? "")
                      setError("")
                      setLastSubmission(null)
                    }}
                    items={PEMASOK_ITEMS}
                  >
                    <SelectTrigger id="pemasok" className="w-full">
                      <SelectValue placeholder="Pilih pemasok" />
                    </SelectTrigger>

                    <SelectContent>
                      {PEMASOK_ITEMS.map((item) => (
                        <SelectItem
                          key={item.value}
                          value={item.value}
                        >
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Transaction Details */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">
                    Detail Bahan
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Tambahkan satu atau beberapa bahan.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addDetail}
                >
                  <Plus className="size-4" />
                  Tambah Bahan
                </Button>
              </div>

              {items.map((item, index) => {
                const selectedBahan = BAHAN_OPTIONS.find(
                  (bahan) => bahan.id === Number(item.id_bahan),
                )

                return (
                  <div
                    key={item.rowId}
                    className="space-y-4 rounded-lg border p-4"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">
                        Bahan {index + 1}
                      </p>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Hapus bahan ${index + 1}`}
                        disabled={items.length === 1}
                        onClick={() => removeDetail(item.rowId)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label
                          htmlFor={`bahan-${item.rowId}`}
                          className="text-sm font-medium"
                        >
                          Nama Bahan
                        </label>

                        <Select
                          value={item.id_bahan}
                          onValueChange={(value) =>
                            updateDetail(item.rowId, {
                              id_bahan: value ?? "",
                            })
                          }
                          items={BAHAN_ITEMS}
                        >
                          <SelectTrigger
                            id={`bahan-${item.rowId}`}
                            className="w-full"
                          >
                            <SelectValue placeholder="Pilih bahan" />
                          </SelectTrigger>

                          <SelectContent>
                            {BAHAN_ITEMS.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label
                          htmlFor={`jumlah-${item.rowId}`}
                          className="text-sm font-medium"
                        >
                          Jumlah
                        </label>

                        <Input
                          id={`jumlah-${item.rowId}`}
                          type="number"
                          min="0"
                          step="any"
                          value={item.jumlah}
                          onChange={(event) =>
                            updateDetail(item.rowId, {
                              jumlah: event.target.value,
                            })
                          }
                          placeholder="Masukkan jumlah"
                        />
                      </div>

                      {isMasuk && (
                        <div className="space-y-2 sm:col-span-2">
                          <label
                            htmlFor={`harga-${item.rowId}`}
                            className="text-sm font-medium"
                          >
                            Harga Beli per Satuan (Rp)
                          </label>

                          <Input
                            id={`harga-${item.rowId}`}
                            type="number"
                            min="0"
                            step="any"
                            value={item.harga_beli_satuan}
                            onChange={(event) =>
                              updateDetail(item.rowId, {
                                harga_beli_satuan: event.target.value,
                              })
                            }
                            placeholder="Contoh: 35000"
                          />
                        </div>
                      )}
                    </div>

                    {selectedBahan && !isMasuk && (
                      <p className="text-xs text-muted-foreground">
                        Stok tersedia: {selectedBahan.stokSaatIni}{" "}
                        {selectedBahan.satuan}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label htmlFor="catatan" className="text-sm font-medium">
                Catatan (Opsional)
              </label>

              <textarea
                id="catatan"
                value={catatan}
                onChange={(event) => {
                  setCatatan(event.target.value)
                  setLastSubmission(null)
                }}
                rows={3}
                placeholder="Tambahkan catatan transaksi..."
                className="w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <div className="flex justify-end">
              <Button type="submit">
                Validasi Transaksi
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Local Validation Result */}
      {lastSubmission && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">
                Ringkasan Transaksi
              </CardTitle>

              <Badge variant="outline">Data sementara</Badge>
            </div>

            <CardDescription>
              Validasi form berhasil. Data belum dikirim ke backend.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            <p className="text-sm">
              Tanggal: {lastSubmission.waktu_transaksi}
            </p>

            {lastSubmission.id_pemasok !== null && (
              <p className="text-sm">
                ID Pemasok: {lastSubmission.id_pemasok}
              </p>
            )}

            <p className="text-sm">
              Jumlah jenis bahan: {lastSubmission.detail.length}
            </p>

            <div className="space-y-2">
              {lastSubmission.detail.map((detail) => {
                const bahan = BAHAN_OPTIONS.find(
                  (option) => option.id === detail.id_bahan,
                )

                return (
                  <div
                    key={detail.id_bahan}
                    className="flex items-center justify-between border-b pb-2 text-sm"
                  >
                    <span>{bahan?.nama ?? "Bahan"}</span>
                    <span className="font-medium">
                      {detail.jumlah} {bahan?.satuan}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
