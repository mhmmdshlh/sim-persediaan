
import { useEffect, useRef, useState, type SubmitEvent } from "react"
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

import { ApiError } from "@/services/api"
import { getActiveBahanList } from "@/services/bahan-service"
import { getPemasokList } from "@/services/pemasok-service"
import { createTransaksi } from "@/services/transaksi-service"

import type { Bahan } from "@/types/bahan"
import type { Pemasok } from "@/types/pemasok"
import type {
  DetailTransaksiDraft,
  JenisTransaksi,
  TransaksiDraft,
  TransaksiResponse,
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

const INITIAL_DETAIL: DetailFormState = {
  rowId: 1,
  id_bahan: "",
  jumlah: "",
  harga_beli_satuan: "",
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message
  }

  return "Tidak dapat terhubung ke server. Periksa koneksi dan coba lagi."
}

function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value)
}

function formatQuantity(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 2,
  }).format(value)
}

export function TransaksiForm({ mode }: TransaksiFormProps) {
  const isMasuk = mode === "masuk"
  const nextRowId = useRef(2)

  const [bahanList, setBahanList] = useState<Bahan[]>([])
  const [pemasokList, setPemasokList] = useState<Pemasok[]>([])

  const [isLoadingOptions, setIsLoadingOptions] = useState(true)
  const [optionError, setOptionError] = useState("")

  const [tanggal, setTanggal] = useState("")
  const [idPemasok, setIdPemasok] = useState("")
  const [catatan, setCatatan] = useState("")
  const [items, setItems] = useState<DetailFormState[]>([
    { ...INITIAL_DETAIL },
  ])

  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [lastSubmission, setLastSubmission] =
    useState<TransaksiResponse | null>(null)

  const title = isMasuk ? "Barang Masuk" : "Barang Keluar"

  // Ambil pilihan bahan dan pemasok dari backend.
  useEffect(() => {
    let isActive = true

    async function loadOptions() {
      try {
        const [bahan, pemasok] = await Promise.all([
          getActiveBahanList(),
          isMasuk ? getPemasokList() : Promise.resolve([]),
        ])

        if (!isActive) return

        setBahanList(bahan.filter((item) => item.aktif))
        setPemasokList(pemasok)
        setOptionError("")
      } catch (err: unknown) {
        if (!isActive) return
        setOptionError(getErrorMessage(err))
      } finally {
        if (isActive) {
          setIsLoadingOptions(false)
        }
      }
    }

    void loadOptions()

    return () => {
      isActive = false
    }
  }, [isMasuk])

  function updateDetail(
    rowId: number,
    changes: Partial<Omit<DetailFormState, "rowId">>,
  ) {
    setItems((current) =>
      current.map((item) =>
        item.rowId === rowId ? { ...item, ...changes } : item,
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
    setItems((current) => current.filter((item) => item.rowId !== rowId))
    setError("")
    setLastSubmission(null)
  }

  function resetForm() {
    setTanggal("")
    setIdPemasok("")
    setCatatan("")
    setItems([{ ...INITIAL_DETAIL }])
    nextRowId.current = 2
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
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

    const selectedIds = items.map((item) => Number(item.id_bahan))

    if (new Set(selectedIds).size !== selectedIds.length) {
      setError("Bahan yang sama tidak boleh dimasukkan dua kali.")
      return
    }

    const details: DetailTransaksiDraft[] = []

    for (const item of items) {
      const jumlah = Number(item.jumlah)

      if (!Number.isFinite(jumlah) || jumlah < 0.01) {
        setError("Jumlah bahan minimal 0,01.")
        return
      }

      if (isMasuk) {
        const harga = Number(item.harga_beli_satuan)

        if (!Number.isInteger(harga) || harga < 1) {
          setError("Harga beli harus berupa bilangan bulat Rupiah dan lebih besar dari nol.")
          return
        }

        details.push({
          id_bahan: Number(item.id_bahan),
          jumlah,
          harga_beli_satuan: harga,
        })
      } else {
        details.push({
          id_bahan: Number(item.id_bahan),
          jumlah,
          harga_beli_satuan: null,
        })
      }
    }

    const payload: TransaksiDraft = {
      waktu_transaksi: tanggal,
      jenis_transaksi: mode,
      id_pemasok: isMasuk ? Number(idPemasok) : null,
      catatan: catatan.trim(),
      detail: details,
    }

    setIsSubmitting(true)

    try {
      const created = await createTransaksi(payload)

      setLastSubmission(created)
      resetForm()

      // Perbarui informasi stok setelah transaksi berhasil.
      try {
        const refreshedBahan = await getActiveBahanList()
        setBahanList(refreshedBahan.filter((item) => item.aktif))
      } catch {
        // Transaksi sudah tersimpan. Kegagalan refresh tidak membatalkannya.
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>

        <p className="mt-1 text-sm text-muted-foreground">
          {isMasuk
            ? "Catat pembelian dan penerimaan bahan."
            : "Catat penggunaan bahan untuk produksi."}
        </p>
      </div>

      {optionError && (
        <div
          className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {optionError}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Informasi Transaksi</CardTitle>
          <CardDescription>
            Lengkapi informasi transaksi dan detail bahan.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
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
                  disabled={isSubmitting}
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
                    items={pemasokList.map((pemasok) => ({
                      label: pemasok.nama_pemasok,
                      value: String(pemasok.id_pemasok),
                    }))}
                    disabled={isLoadingOptions || isSubmitting || pemasokList.length === 0}
                  >
                    <SelectTrigger id="pemasok" className="w-full">
                      <SelectValue
                        placeholder={
                          isLoadingOptions
                            ? "Memuat pemasok..."
                            : pemasokList.length === 0
                              ? "Belum ada pemasok"
                              : "Pilih pemasok"
                        }
                      />
                    </SelectTrigger>

                    <SelectContent>
                      {pemasokList.map((pemasok) => (
                        <SelectItem
                          key={pemasok.id_pemasok}
                          value={String(pemasok.id_pemasok)}
                        >
                          {pemasok.nama_pemasok}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">Detail Bahan</h2>
                  <p className="text-sm text-muted-foreground">
                    Tambahkan satu atau beberapa bahan.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addDetail}
                  disabled={isSubmitting}
                >
                  <Plus className="size-4" />
                  Tambah Bahan
                </Button>
              </div>

              {isLoadingOptions ? (
                <p className="rounded-md border p-4 text-sm text-muted-foreground">
                  Memuat daftar bahan...
                </p>
              ) : bahanList.length === 0 ? (
                <p className="rounded-md border p-4 text-sm text-muted-foreground">
                  Belum ada bahan aktif. Tambahkan atau aktifkan bahan terlebih dahulu.
                </p>
              ) : (
                items.map((item, index) => {
                  const selectedBahan = bahanList.find(
                    (bahan) => bahan.id_bahan === Number(item.id_bahan),
                  )

                  const selectedIds = items
                    .filter((other) => other.rowId !== item.rowId)
                    .map((other) => other.id_bahan)

                  const availableBahan = bahanList.filter(
                    (bahan) => !selectedIds.includes(String(bahan.id_bahan)),
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
                          disabled={items.length === 1 || isSubmitting}
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
                            items={availableBahan.map((bahan) => ({
                              label: `${bahan.nama_bahan} (${bahan.nama_satuan})`,
                              value: String(bahan.id_bahan),
                            }))}
                            disabled={isSubmitting}
                          >
                            <SelectTrigger
                              id={`bahan-${item.rowId}`}
                              className="w-full"
                            >
                              <SelectValue placeholder="Pilih bahan" />
                            </SelectTrigger>

                            <SelectContent>
                              {availableBahan.map((bahan) => (
                                <SelectItem
                                  key={bahan.id_bahan}
                                  value={String(bahan.id_bahan)}
                                >
                                  {bahan.nama_bahan} ({bahan.nama_satuan})
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
                            min="0.01"
                            step="0.01"
                            value={item.jumlah}
                            onChange={(event) =>
                              updateDetail(item.rowId, {
                                jumlah: event.target.value,
                              })
                            }
                            placeholder="Masukkan jumlah"
                            disabled={isSubmitting}
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
                              min="1"
                              step="1"
                              value={item.harga_beli_satuan}
                              onChange={(event) =>
                                updateDetail(item.rowId, {
                                  harga_beli_satuan: event.target.value,
                                })
                              }
                              placeholder="Contoh: 35000"
                              disabled={isSubmitting}
                            />
                          </div>
                        )}
                      </div>

                      {selectedBahan && (
                        <p className="text-xs text-muted-foreground">
                          Stok tersedia:{" "}
                          {formatQuantity(selectedBahan.stok_saat_ini)}{" "}
                          {selectedBahan.nama_satuan}
                        </p>
                      )}
                    </div>
                  )
                })
              )}
            </div>

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
                maxLength={500}
                placeholder="Tambahkan catatan transaksi..."
                disabled={isSubmitting}
                className="w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={
                  isLoadingOptions ||
                  isSubmitting ||
                  bahanList.length === 0 ||
                  (isMasuk && pemasokList.length === 0)
                }
              >
                {isSubmitting ? "Menyimpan..." : "Simpan Transaksi"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {lastSubmission && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">
                Transaksi Berhasil Disimpan
              </CardTitle>

              <Badge variant="outline">
                {lastSubmission.jenis_transaksi === "masuk"
                  ? "Barang Masuk"
                  : "Barang Keluar"}
              </Badge>
            </div>

            <CardDescription>
              Data berikut berasal dari respons backend.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            <p className="break-all text-sm">
              ID Transaksi: {lastSubmission.id_transaksi}
            </p>

            <p className="text-sm">
              Tanggal: {lastSubmission.waktu_transaksi}
            </p>

            {lastSubmission.nama_pemasok && (
              <p className="text-sm">
                Pemasok: {lastSubmission.nama_pemasok}
              </p>
            )}

            {lastSubmission.catatan && (
              <p className="text-sm">
                Catatan: {lastSubmission.catatan}
              </p>
            )}

            <div className="space-y-2 border-t pt-3">
              {lastSubmission.detail.map((detail) => (
                <div
                  key={detail.id_bahan}
                  className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{detail.nama_bahan}</p>
                    <p className="text-muted-foreground">
                      {formatQuantity(detail.jumlah)} {detail.satuan}
                    </p>
                  </div>

                  {lastSubmission.jenis_transaksi === "masuk" && (
                    <span>
                      {formatRupiah(detail.subtotal)}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {lastSubmission.jenis_transaksi === "masuk" && (
              <div className="flex justify-between pt-2 font-semibold">
                <span>Total Pembelian</span>
                <span>
                  {formatRupiah(lastSubmission.total_pembelian)}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
