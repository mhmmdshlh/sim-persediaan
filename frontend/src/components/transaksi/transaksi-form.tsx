import { useEffect, useRef, useState, type SubmitEvent } from "react"
import { CheckCircle2, Plus, Trash2 } from "lucide-react"

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

import {
  formatCurrency as formatRupiah,
  formatDate,
  formatQuantity,
  getErrorMessage,
  getTodayDateString,
} from "@/lib/format"
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

export function TransaksiForm({ mode }: TransaksiFormProps) {
  const isMasuk = mode === "masuk"
  const nextRowId = useRef(2)

  const [bahanList, setBahanList] = useState<Bahan[]>([])
  const [pemasokList, setPemasokList] = useState<Pemasok[]>([])

  const [isLoadingOptions, setIsLoadingOptions] = useState(true)
  const [optionError, setOptionError] = useState("")

  const [tanggal, setTanggal] = useState(() => getTodayDateString())
  const [idPemasok, setIdPemasok] = useState("")
  const [catatan, setCatatan] = useState("")
  const [items, setItems] = useState<DetailFormState[]>([
    { ...INITIAL_DETAIL },
  ])

  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [lastSubmission, setLastSubmission] =
    useState<TransaksiResponse | null>(null)

  const title = isMasuk ? "Catat Barang Masuk" : "Catat Barang Keluar"

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

  function quickPickBahan(idBahan: number) {
    const idStr = String(idBahan)

    if (items.some((item) => item.id_bahan === idStr)) {
      return
    }

    const emptyRow = items.find((item) => !item.id_bahan)

    if (emptyRow) {
      updateDetail(emptyRow.rowId, { id_bahan: idStr })
      return
    }

    const rowId = nextRowId.current
    nextRowId.current += 1

    setItems((current) => [
      ...current,
      {
        rowId,
        id_bahan: idStr,
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
    setTanggal(getTodayDateString())
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
      setError("Tanggal wajib diisi.")
      return
    }

    if (isMasuk && !idPemasok) {
      setError("Pilih toko pemasok terlebih dahulu.")
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
      setError("Pastikan nama bahan, jumlah, dan harga sudah diisi lengkap.")
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
          setError("Harga beli harus berupa angka Rupiah lebih dari nol.")
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

        <p className="mt-1 text-base text-muted-foreground">
          {isMasuk
            ? "Catat bahan yang baru dibeli dari toko langganan."
            : "Kurangi stok bahan yang dipakai masak hari ini."}
        </p>
      </div>

      {optionError && (
        <div
          className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-base font-medium text-destructive"
          role="alert"
        >
          {optionError}
        </div>
      )}

      {lastSubmission && (
        <Card className="border-2 border-emerald-400 bg-emerald-50/60">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-emerald-900">
                <CheckCircle2 className="size-6 shrink-0 text-emerald-600" />
                <CardTitle className="text-lg font-bold">
                  Catatan Berhasil Disimpan!
                </CardTitle>
              </div>

              <Badge
                variant="outline"
                className="border-emerald-400 bg-emerald-100 text-emerald-900"
              >
                {lastSubmission.jenis_transaksi === "masuk"
                  ? "Barang Masuk"
                  : "Barang Keluar"}
              </Badge>
            </div>

            <CardDescription className="text-sm text-emerald-900/80">
              Tanggal {formatDate(lastSubmission.waktu_transaksi)}
              {lastSubmission.nama_pemasok
                ? ` • Pemasok: ${lastSubmission.nama_pemasok}`
                : ""}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            <div className="space-y-2 rounded-xl bg-white/80 p-3">
              {lastSubmission.detail.map((detail) => {
                const updatedBahan = bahanList.find(
                  (bahan) => bahan.id_bahan === detail.id_bahan,
                )

                return (
                  <div
                    key={detail.id_bahan}
                    className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 last:border-b-0 last:pb-0"
                  >
                    <div>
                      <p className="text-base font-bold">{detail.nama_bahan}</p>
                      <p className="text-sm text-muted-foreground">
                        {lastSubmission.jenis_transaksi === "masuk"
                          ? "Ditambah"
                          : "Dikurangi"}{" "}
                        <span className="font-semibold text-foreground">
                          {formatQuantity(detail.jumlah)} {detail.satuan}
                        </span>
                        {updatedBahan && (
                          <>
                            {" "}
                            • Sisa stok sekarang:{" "}
                            <span className="font-bold text-foreground">
                              {formatQuantity(updatedBahan.stok_saat_ini)}{" "}
                              {updatedBahan.nama_satuan}
                            </span>
                          </>
                        )}
                      </p>
                    </div>

                    {lastSubmission.jenis_transaksi === "masuk" && (
                      <span className="text-base font-bold">
                        {formatRupiah(detail.subtotal)}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            {lastSubmission.jenis_transaksi === "masuk" && (
              <div className="flex justify-between pt-1 text-base font-bold text-emerald-950">
                <span>Total Belanja</span>
                <span>
                  {formatRupiah(lastSubmission.total_pembelian)}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-bold">Isi Catatan</CardTitle>
          <CardDescription className="text-sm">
            Tanggal otomatis terisi hari ini. Pilih bahan lalu masukkan jumlahnya.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="tanggal" className="text-base font-medium">
                  Tanggal
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
                  <label htmlFor="pemasok" className="text-base font-medium">
                    Beli di Toko / Pemasok
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
                              : "Pilih toko langganan"
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

            {/* Tombol pilih cepat bahan */}
            {!isLoadingOptions && bahanList.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-muted-foreground">
                  Ketuk bahan untuk memilih cepat:
                </p>

                <div className="flex flex-wrap gap-2">
                  {bahanList.slice(0, 10).map((bahan) => {
                    const isSelected = items.some(
                      (item) => Number(item.id_bahan) === bahan.id_bahan,
                    )

                    return (
                      <Button
                        key={bahan.id_bahan}
                        type="button"
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        disabled={isSelected || isSubmitting}
                        onClick={() => quickPickBahan(bahan.id_bahan)}
                      >
                        {bahan.nama_bahan} ({formatQuantity(bahan.stok_saat_ini)}{" "}
                        {bahan.nama_satuan})
                      </Button>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold">Daftar Bahan</h2>
                  <p className="text-sm text-muted-foreground">
                    Bisa catat satu atau beberapa bahan sekaligus.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={addDetail}
                  disabled={isSubmitting}
                >
                  <Plus className="size-4" />
                  Tambah Baris Bahan
                </Button>
              </div>

              {isLoadingOptions ? (
                <p className="rounded-xl border p-4 text-base text-muted-foreground">
                  Memuat daftar bahan...
                </p>
              ) : bahanList.length === 0 ? (
                <p className="rounded-xl border p-4 text-base text-muted-foreground">
                  Belum ada bahan aktif. Tambahkan bahan di menu Stok terlebih dahulu.
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

                  const numericHarga = Number(item.harga_beli_satuan)
                  const numericJumlah = Number(item.jumlah)

                  return (
                    <div
                      key={item.rowId}
                      className="space-y-4 rounded-2xl border-2 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-base font-bold">
                          Bahan {index + 1}
                        </p>

                        {items.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-label={`Hapus bahan ${index + 1}`}
                            disabled={isSubmitting}
                            onClick={() => removeDetail(item.rowId)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="size-4" />
                            Hapus
                          </Button>
                        )}
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <label
                            htmlFor={`bahan-${item.rowId}`}
                            className="text-base font-medium"
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
                            className="text-base font-medium"
                          >
                            Jumlah{" "}
                            {selectedBahan
                              ? `(${selectedBahan.nama_satuan})`
                              : ""}
                          </label>

                          <Input
                            id={`jumlah-${item.rowId}`}
                            type="number"
                            inputMode="decimal"
                            min="0.01"
                            step="any"
                            value={item.jumlah}
                            onChange={(event) =>
                              updateDetail(item.rowId, {
                                jumlah: event.target.value,
                              })
                            }
                            placeholder="Contoh: 2"
                            disabled={isSubmitting}
                          />
                        </div>

                        {isMasuk && (
                          <div className="space-y-2 sm:col-span-2">
                            <label
                              htmlFor={`harga-${item.rowId}`}
                              className="text-base font-medium"
                            >
                              Harga Beli per{" "}
                              {selectedBahan
                                ? selectedBahan.nama_satuan
                                : "Satuan"}{" "}
                              (Rp)
                            </label>

                            <Input
                              id={`harga-${item.rowId}`}
                              type="number"
                              inputMode="numeric"
                              min="1"
                              step="1"
                              value={item.harga_beli_satuan}
                              onChange={(event) =>
                                updateDetail(item.rowId, {
                                  harga_beli_satuan: event.target.value,
                                })
                              }
                              placeholder="Contoh: 50000"
                              disabled={isSubmitting}
                            />

                            {Number.isFinite(numericHarga) &&
                              numericHarga > 0 && (
                                <p className="text-sm font-semibold text-emerald-800">
                                  Terbaca: {formatRupiah(numericHarga)}
                                  {Number.isFinite(numericJumlah) &&
                                    numericJumlah > 0 &&
                                    ` • Subtotal: ${formatRupiah(Math.round(numericHarga * numericJumlah))}`}
                                </p>
                              )}
                          </div>
                        )}
                      </div>

                      {selectedBahan && (
                        <p className="rounded-xl bg-muted/60 px-3 py-2 text-sm">
                          Sisa stok saat ini:{" "}
                          <span className="font-bold">
                            {formatQuantity(selectedBahan.stok_saat_ini)}{" "}
                            {selectedBahan.nama_satuan}
                          </span>
                        </p>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="catatan" className="text-base font-medium">
                Keterangan Tambahan (Boleh Dikosongkan)
              </label>

              <textarea
                id="catatan"
                value={catatan}
                onChange={(event) => {
                  setCatatan(event.target.value)
                  setLastSubmission(null)
                }}
                rows={2}
                maxLength={500}
                placeholder="Contoh: Beli cabai banyak karena harga murah..."
                disabled={isSubmitting}
                className="w-full resize-y rounded-2xl border border-input bg-background px-3.5 py-2.5 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
              />
            </div>

            {error && (
              <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-base font-medium text-destructive" role="alert">
                {error}
              </p>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={
                isLoadingOptions ||
                isSubmitting ||
                bahanList.length === 0 ||
                (isMasuk && pemasokList.length === 0)
              }
            >
              {isSubmitting ? "Menyimpan..." : `Simpan ${title}`}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
