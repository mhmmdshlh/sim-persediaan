import { useEffect, useState, type SubmitEvent } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  ChefHat,
  Minus,
  Plus,
  Search,
  Store,
  X,
  XOctagon,
} from "lucide-react"

import {
  formatCurrency,
  formatQuantity,
  getErrorMessage,
  getTodayDateString,
} from "@/lib/format"
import { loadOwnerNotes, saveOwnerNotes } from "@/lib/resep-menu"
import { getActiveBahanList, updateBahan } from "@/services/bahan-service"
import { getDashboard } from "@/services/dashboard-service"
import { createPemasok, getPemasokList } from "@/services/pemasok-service"
import { createTransaksi } from "@/services/transaksi-service"

import type { Bahan, StatusStok } from "@/types/bahan"
import type { DashboardResponse } from "@/types/dashboard"
import type { Pemasok } from "@/types/pemasok"
import type { JenisTransaksi } from "@/types/transaksi"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const STATUS_PRIORITY: Record<StatusStok, number> = {
  habis: 0,
  menipis: 1,
  aman: 2,
}

const QUICK_AMOUNTS = [1, 2, 5, 10]

function renderStatusBadge(status: StatusStok) {
  switch (status) {
    case "habis":
      return (
        <Badge
          variant="outline"
          className="border-red-400 bg-red-100 text-red-900"
        >
          <XOctagon className="size-3.5" aria-hidden="true" />
          <span>HABIS</span>
        </Badge>
      )
    case "menipis":
      return (
        <Badge
          variant="outline"
          className="border-amber-400 bg-amber-100 text-amber-950"
        >
          <AlertTriangle className="size-3.5" aria-hidden="true" />
          <span>MENIPIS</span>
        </Badge>
      )
    case "aman":
      return (
        <Badge
          variant="outline"
          className="border-stone-300 bg-stone-100 text-stone-800"
        >
          <CheckCircle2
            className="size-3.5 text-emerald-700"
            aria-hidden="true"
          />
          <span>AMAN</span>
        </Badge>
      )
  }
}

export function DashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null)
  const [bahanList, setBahanList] = useState<Bahan[]>([])
  const [pemasokList, setPemasokList] = useState<Pemasok[]>([])

  // Catatan Masak Hari Ini (pengingat sudah masak apa saja sebelum rekap stok)
  const [cookNotes, setCookNotes] = useState<string[]>(() => loadOwnerNotes())
  const [addingNote, setAddingNote] = useState(false)
  const [newNoteText, setNewNoteText] = useState("")

  const [filterMode, setFilterMode] = useState<"semua" | "menipis">("semua")
  const [searchQuery, setSearchQuery] = useState("")

  const [loadedRefreshKey, setLoadedRefreshKey] = useState<number | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [pageError, setPageError] = useState("")
  const [notice, setNotice] = useState("")

  // State Popup + Beli / - Pakai 1 bahan
  const [quickTarget, setQuickTarget] = useState<{
    bahan: Bahan
    mode: JenisTransaksi
  } | null>(null)
  const [quickJumlah, setQuickJumlah] = useState("")
  const [quickHarga, setQuickHarga] = useState("")
  const [quickPemasok, setQuickPemasok] = useState("")
  const [quickError, setQuickError] = useState("")
  const [isSavingQuick, setIsSavingQuick] = useState(false)

  // State Tambah Toko Baru langsung di dalam popup Beli
  const [showNewPemasok, setShowNewPemasok] = useState(false)
  const [newPemasokName, setNewPemasokName] = useState("")
  const [newPemasokPhone, setNewPemasokPhone] = useState("")
  const [isSavingPemasok, setIsSavingPemasok] = useState(false)

  // State Sesuaikan Sisa Kulkas/Rak (default dicentang agar otomatis tercatat di riwayat & laporan pemakaian)
  const [opnameTarget, setOpnameTarget] = useState<Bahan | null>(null)
  const [opnameValue, setOpnameValue] = useState("")
  const [opnameAffectUsage, setOpnameAffectUsage] = useState(true)
  const [opnameError, setOpnameError] = useState("")
  const [isSavingOpname, setIsSavingOpname] = useState(false)

  const isLoading = loadedRefreshKey !== refreshKey

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(""), 2500)
    return () => window.clearTimeout(timer)
  }, [notice])

  useEffect(() => {
    let isActive = true

    Promise.all([getDashboard(), getActiveBahanList(), getPemasokList()])
      .then(([dashData, bahanData, pemasokData]) => {
        if (!isActive) return

        const sortedBahan = [...bahanData]
          .filter((item) => item.aktif)
          .sort(
            (a, b) =>
              STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status] ||
              a.nama_bahan.localeCompare(b.nama_bahan, "id-ID"),
          )

        setDashboard(dashData)
        setBahanList(sortedBahan)
        setPemasokList(pemasokData)
        setPageError("")
        setLoadedRefreshKey(refreshKey)
      })
      .catch((error: unknown) => {
        if (!isActive) return

        setDashboard(null)
        setPageError(getErrorMessage(error))
        setLoadedRefreshKey(refreshKey)
      })

    return () => {
      isActive = false
    }
  }, [refreshKey])

  function handleRefresh() {
    setRefreshKey((current) => current + 1)
  }

  function handleAddNote(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = newNoteText.trim()
    if (!trimmed) return

    const updated = [...cookNotes, trimmed]
    setCookNotes(updated)
    saveOwnerNotes(updated)
    setNewNoteText("")
    setAddingNote(false)
  }

  function handleRemoveNote(index: number) {
    const updated = cookNotes.filter((_, i) => i !== index)
    setCookNotes(updated)
    saveOwnerNotes(updated)
  }

  function openQuickModal(bahan: Bahan, mode: JenisTransaksi) {
    setQuickTarget({ bahan, mode })
    setQuickJumlah("1")
    setQuickHarga(
      mode === "masuk" && bahan.harga_terakhir > 0
        ? String(bahan.harga_terakhir)
        : "",
    )
    setQuickPemasok(
      pemasokList[0] ? String(pemasokList[0].id_pemasok) : "",
    )
    setShowNewPemasok(false)
    setNewPemasokName("")
    setNewPemasokPhone("")
    setQuickError("")
  }

  function adjustQuickJumlah(delta: number) {
    const current = Number(quickJumlah) || 0
    const next = Math.max(0.5, Number((current + delta).toFixed(2)))
    setQuickJumlah(String(next))
    setQuickError("")
  }

  async function handleAddInlinePemasok() {
    const trimmed = newPemasokName.trim()
    if (!trimmed) {
      setQuickError("Ketik nama toko baru terlebih dahulu.")
      return
    }

    setIsSavingPemasok(true)
    setQuickError("")

    try {
      const created = await createPemasok({
        nama_pemasok: trimmed,
        no_telepon: newPemasokPhone.trim(),
        alamat: "",
      })

      setPemasokList((current) => [...current, created])
      setQuickPemasok(String(created.id_pemasok))
      setShowNewPemasok(false)
      setNewPemasokName("")
      setNewPemasokPhone("")
    } catch (error: unknown) {
      setQuickError(getErrorMessage(error))
    } finally {
      setIsSavingPemasok(false)
    }
  }

  async function handleQuickSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!quickTarget) return

    const { bahan, mode } = quickTarget
    const isMasuk = mode === "masuk"
    const jumlah = Number(quickJumlah)

    if (!Number.isFinite(jumlah) || jumlah < 0.01) {
      setQuickError("Masukkan jumlah lebih dari 0.")
      return
    }

    if (!isMasuk && jumlah > bahan.stok_saat_ini) {
      setQuickError(
        `Stok tercatat tinggal ${formatQuantity(bahan.stok_saat_ini)} ${bahan.nama_satuan}.`,
      )
      return
    }

    const harga = isMasuk ? Number(quickHarga) : null

    if (isMasuk && (!harga || !Number.isInteger(harga) || harga < 1)) {
      setQuickError("Masukkan harga beli Rupiah.")
      return
    }

    let pemasokIdToUse = quickPemasok ? Number(quickPemasok) : null
    if (isMasuk && showNewPemasok && newPemasokName.trim()) {
      setIsSavingQuick(true)
      try {
        const created = await createPemasok({
          nama_pemasok: newPemasokName.trim(),
          no_telepon: newPemasokPhone.trim(),
          alamat: "",
        })
        setPemasokList((current) => [...current, created])
        pemasokIdToUse = created.id_pemasok
      } catch (error: unknown) {
        setQuickError(getErrorMessage(error))
        setIsSavingQuick(false)
        return
      }
    }

    if (isMasuk && !pemasokIdToUse) {
      setQuickError("Pilih toko pemasok atau tambah toko baru.")
      return
    }

    setIsSavingQuick(true)
    setQuickError("")

    try {
      await createTransaksi({
        waktu_transaksi: dashboard?.tanggal_wib || getTodayDateString(),
        jenis_transaksi: mode,
        id_pemasok: isMasuk ? pemasokIdToUse : null,
        catatan: isMasuk ? "Beli bahan" : "Pakai untuk masak",
        detail: [
          {
            id_bahan: bahan.id_bahan,
            jumlah,
            harga_beli_satuan: harga,
          },
        ],
      })

      setNotice("Tersimpan ✓")
      setQuickTarget(null)
      handleRefresh()
    } catch (error: unknown) {
      setQuickError(getErrorMessage(error))
    } finally {
      setIsSavingQuick(false)
    }
  }

  function openOpnameModal(bahan: Bahan) {
    setOpnameTarget(bahan)
    setOpnameValue(String(bahan.stok_saat_ini))
    setOpnameAffectUsage(true)
    setOpnameError("")
  }

  async function handleOpnameSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!opnameTarget) return

    const targetActual = Number(opnameValue)
    if (!Number.isFinite(targetActual) || targetActual < 0) {
      setOpnameError("Masukkan angka sisa stok nyata (minimal 0).")
      return
    }

    const diff = Number((targetActual - opnameTarget.stok_saat_ini).toFixed(2))
    if (Math.abs(diff) < 0.01) {
      setOpnameTarget(null)
      return
    }

    setIsSavingOpname(true)
    setOpnameError("")

    try {
      if (opnameAffectUsage && diff < 0) {
        await createTransaksi({
          waktu_transaksi: dashboard?.tanggal_wib || getTodayDateString(),
          jenis_transaksi: "keluar",
          id_pemasok: null,
          catatan: "Penyesuaian pemakaian stok dapur",
          detail: [
            {
              id_bahan: opnameTarget.id_bahan,
              jumlah: Math.abs(diff),
              harga_beli_satuan: null,
            },
          ],
        })
      } else {
        await updateBahan(opnameTarget.id_bahan, {
          stok_saat_ini: targetActual,
        })
      }

      setNotice("Sisa disesuaikan ✓")
      setOpnameTarget(null)
      handleRefresh()
    } catch (error: unknown) {
      setOpnameError(getErrorMessage(error))
    } finally {
      setIsSavingOpname(false)
    }
  }

  const lowStockCount = bahanList.filter(
    (item) => item.status === "habis" || item.status === "menipis",
  ).length

  const visibleBahan = bahanList.filter((item) => {
    if (
      filterMode === "menipis" &&
      item.status !== "habis" &&
      item.status !== "menipis"
    ) {
      return false
    }

    if (!searchQuery.trim()) return true

    return item.nama_bahan
      .toLowerCase()
      .includes(searchQuery.trim().toLowerCase())
  })

  return (
    <div className="space-y-4">
      {/* Toast singkat */}
      <div aria-live="polite">
        {notice && (
          <div
            role="status"
            className="fixed top-16 right-4 z-50 flex items-center gap-2 rounded-full bg-stone-900 px-4 py-2 text-sm font-bold text-white shadow-lg"
          >
            <CheckCircle2
              className="size-4 shrink-0 text-amber-400"
              aria-hidden="true"
            />
            <span>{notice}</span>
          </div>
        )}
      </div>

      {/* Kotak Catatan Masak Hari Ini (Pengingat sudah masak apa saja hari ini sebelum rekap stok) */}
      <div className="rounded-2xl border-2 border-orange-300 bg-orange-50/70 p-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-orange-950">
            <ChefHat
              className="size-5 shrink-0 text-red-600"
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-extrabold">
                Catatan Masak Hari Ini
                {cookNotes.length > 0 ? ` (${cookNotes.length})` : ""}
              </p>
              {cookNotes.length === 0 && !addingNote && (
                <p className="text-xs font-medium text-stone-600">
                  Belum ada catatan masak. Tekan + Tambah untuk mencatat
                  masakan hari ini.
                </p>
              )}
            </div>
          </div>

          {!addingNote && (
            <button
              type="button"
              onClick={() => setAddingNote(true)}
              className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-1 rounded-full border border-orange-400 bg-white px-3 text-xs font-extrabold text-orange-950 shadow-2xs hover:bg-orange-100"
            >
              <Plus className="size-3.5" aria-hidden="true" />
              <span>Tambah</span>
            </button>
          )}
        </div>

        {addingNote && (
          <form onSubmit={handleAddNote} className="mt-3 flex gap-2">
            <Input
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              placeholder="Misal: Ayam Presto 2 panci, Sambel 30 botol..."
              className="h-10 bg-white text-sm"
              autoFocus
            />
            <Button type="submit" size="sm" className="shrink-0">
              Simpan
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setAddingNote(false)
                setNewNoteText("")
              }}
              className="shrink-0"
            >
              Batal
            </Button>
          </form>
        )}

        {cookNotes.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {cookNotes.map((note, idx) => (
              <li
                key={idx}
                className="flex items-center justify-between gap-2 rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm font-bold text-stone-900"
              >
                <span>{note}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveNote(idx)}
                  aria-label={`Hapus catatan ${note}`}
                  className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-stone-400 hover:bg-red-50 hover:text-red-600"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {pageError && (
        <div
          className="rounded-2xl border-2 border-red-300 bg-red-50 p-4 text-base font-bold text-red-800"
          role="alert"
        >
          {pageError}
        </div>
      )}

      {isLoading ? (
        <div className="py-12 text-center text-base font-medium text-stone-500">
          Memuat...
        </div>
      ) : dashboard ? (
        <>
          {/* Filter + Cari Bahan */}
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <button
                type="button"
                onClick={() => setFilterMode("semua")}
                className={`h-11 cursor-pointer rounded-full border-2 px-4 text-sm font-extrabold transition-colors ${
                  filterMode === "semua"
                    ? "border-stone-900 bg-stone-900 text-white"
                    : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
                }`}
              >
                Semua ({bahanList.length})
              </button>

              <button
                type="button"
                onClick={() => setFilterMode("menipis")}
                className={`inline-flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-full border-2 px-4 text-sm font-extrabold transition-colors ${
                  filterMode === "menipis"
                    ? "border-red-600 bg-red-600 text-white"
                    : lowStockCount > 0
                      ? "border-red-300 bg-red-50 text-red-900 hover:bg-red-100"
                      : "border-stone-200 bg-white text-stone-700"
                }`}
              >
                <AlertTriangle className="size-4" aria-hidden="true" />
                <span>Perlu Beli ({lowStockCount})</span>
              </button>
            </div>

            <div className="relative flex-1 sm:max-w-xs">
              <label htmlFor="cari-bahan-beranda" className="sr-only">
                Cari nama bahan
              </label>
              <Search
                className="absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-stone-400"
                aria-hidden="true"
              />
              <Input
                id="cari-bahan-beranda"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Cari bahan..."
                className="bg-white pl-11"
              />
            </div>
          </div>

          {/* Grid Kartu Stok Bahan (Fluid menyesuaikan semua layar HP) */}
          {visibleBahan.length > 0 ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,18.5rem),1fr))] gap-3.5">
              {visibleBahan.map((bahan) => {
                const cardBorder =
                  bahan.status === "habis"
                    ? "border-2 border-red-300 bg-white"
                    : bahan.status === "menipis"
                      ? "border-2 border-amber-300 bg-white"
                      : "border border-stone-200 bg-white"

                return (
                  <div
                    key={bahan.id_bahan}
                    className={`flex flex-col justify-between gap-3 rounded-3xl p-4 shadow-xs ${cardBorder}`}
                  >
                    {/* Baris 1: Nama Bahan & Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h2 className="text-xl font-extrabold leading-snug text-stone-900">
                          {bahan.nama_bahan}
                        </h2>
                        <p className="text-xs font-semibold text-stone-500">
                          Min. {formatQuantity(bahan.stok_minimum)}{" "}
                          {bahan.nama_satuan}
                        </p>
                      </div>

                      {renderStatusBadge(bahan.status)}
                    </div>

                    {/* Baris 2: Kotak Sisa (Ketuk langsung untuk samakan dengan sisa di kulkas/rak) */}
                    <button
                      type="button"
                      onClick={() => openOpnameModal(bahan)}
                      className="flex w-full cursor-pointer items-baseline justify-between rounded-2xl border border-stone-200/80 bg-stone-50/80 px-4 py-2.5 text-left transition-colors hover:border-red-300 hover:bg-orange-50/40"
                    >
                      <span className="text-sm font-bold text-stone-600">
                        Sisa{" "}
                        <span className="text-xs font-extrabold text-red-700 underline underline-offset-2">
                          (sesuaikan kulkas)
                        </span>
                      </span>
                      <span className="text-2xl font-black tracking-tight text-stone-900 tabular-nums">
                        {formatQuantity(bahan.stok_saat_ini)}{" "}
                        <span className="text-base font-bold text-stone-500">
                          {bahan.nama_satuan}
                        </span>
                      </span>
                    </button>

                    {/* Baris 3: + Beli & - Pakai Manual */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <Button
                        type="button"
                        onClick={() => openQuickModal(bahan, "masuk")}
                        className="bg-red-600 font-extrabold text-white hover:bg-red-700"
                      >
                        <Plus className="size-4" aria-hidden="true" />
                        <span>Beli</span>
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        disabled={bahan.stok_saat_ini <= 0}
                        onClick={() => openQuickModal(bahan, "keluar")}
                        className="border-2 border-orange-300 bg-orange-50 font-extrabold text-orange-950 hover:bg-orange-100"
                      >
                        <Minus className="size-4" aria-hidden="true" />
                        <span>Pakai</span>
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="rounded-3xl border bg-white py-10 text-center text-base font-semibold text-stone-500">
              {filterMode === "menipis"
                ? "Semua stok aman."
                : "Bahan tidak ditemukan."}
            </div>
          )}
        </>
      ) : (
        <div className="py-12 text-center text-base font-medium text-stone-500">
          Data stok belum tersedia.
        </div>
      )}

      {/* POPUP 1: SESUAIKAN SISA KULKAS / RAK */}
      <Dialog
        open={opnameTarget !== null}
        onOpenChange={(open) => {
          if (!open && !isSavingOpname) setOpnameTarget(null)
        }}
      >
        <DialogContent className="rounded-3xl sm:max-w-md">
          {opnameTarget && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-extrabold">
                  Sesuaikan Sisa {opnameTarget.nama_bahan}
                </DialogTitle>
                <DialogDescription className="text-sm">
                  Ketik sisa stok yang terlihat di kulkas/rak saat ini.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleOpnameSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label
                    htmlFor="sisa-nyata-input"
                    className="text-base font-bold"
                  >
                    Sisa di Kulkas/Rak ({opnameTarget.nama_satuan})
                  </label>
                  <Input
                    id="sisa-nyata-input"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    value={opnameValue}
                    onChange={(e) => {
                      setOpnameValue(e.target.value)
                      setOpnameError("")
                    }}
                    className="h-12 text-center text-xl font-extrabold tabular-nums"
                    required
                    disabled={isSavingOpname}
                  />
                </div>

                {Number(opnameValue) < opnameTarget.stok_saat_ini && (
                  <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border bg-stone-50 p-3 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={opnameAffectUsage}
                      onChange={(e) => setOpnameAffectUsage(e.target.checked)}
                      className="mt-1 size-4 accent-red-600"
                    />
                    <span>
                      Catat selisihnya sebagai bahan terpakai masak hari ini
                    </span>
                  </label>
                )}

                {opnameError && (
                  <p
                    className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-bold text-red-700"
                    role="alert"
                  >
                    {opnameError}
                  </p>
                )}

                <DialogFooter className="gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={() => setOpnameTarget(null)}
                    disabled={isSavingOpname}
                  >
                    Batal
                  </Button>
                  <Button type="submit" size="lg" disabled={isSavingOpname}>
                    {isSavingOpname ? "Menyimpan..." : "Simpan"}
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* POPUP 2: Cepat + Beli / - Pakai 1 Bahan */}
      <Dialog
        open={quickTarget !== null}
        onOpenChange={(open) => {
          if (!open && !isSavingQuick) setQuickTarget(null)
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-3xl sm:max-w-md">
          {quickTarget && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-extrabold">
                  {quickTarget.mode === "masuk"
                    ? `Beli ${quickTarget.bahan.nama_bahan}`
                    : `Pakai ${quickTarget.bahan.nama_bahan}`}
                </DialogTitle>
                <DialogDescription className="text-base">
                  Sisa:{" "}
                  <span className="font-bold text-foreground tabular-nums">
                    {formatQuantity(quickTarget.bahan.stok_saat_ini)}{" "}
                    {quickTarget.bahan.nama_satuan}
                  </span>
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleQuickSubmit} className="space-y-4">
                <div className="space-y-2.5">
                  <label
                    htmlFor="quick-jumlah"
                    className="text-base font-bold"
                  >
                    Jumlah ({quickTarget.bahan.nama_satuan})
                  </label>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={() => adjustQuickJumlah(-1)}
                      disabled={isSavingQuick}
                      aria-label="Kurangi 1"
                      className="px-4 font-extrabold"
                    >
                      <Minus className="size-5" aria-hidden="true" />
                    </Button>

                    <Input
                      id="quick-jumlah"
                      type="number"
                      inputMode="decimal"
                      min="0.01"
                      step="any"
                      value={quickJumlah}
                      onChange={(event) => {
                        setQuickJumlah(event.target.value)
                        setQuickError("")
                      }}
                      className="h-12 text-center text-xl font-extrabold tabular-nums"
                      required
                      disabled={isSavingQuick}
                    />

                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={() => adjustQuickJumlah(1)}
                      disabled={isSavingQuick}
                      aria-label="Tambah 1"
                      className="px-4 font-extrabold"
                    >
                      <Plus className="size-5" aria-hidden="true" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {QUICK_AMOUNTS.map((num) => (
                      <Button
                        key={num}
                        type="button"
                        variant={
                          Number(quickJumlah) === num ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => {
                          setQuickJumlah(String(num))
                          setQuickError("")
                        }}
                      >
                        {num} {quickTarget.bahan.nama_satuan}
                      </Button>
                    ))}
                  </div>
                </div>

                {quickTarget.mode === "masuk" && (
                  <>
                    <div className="space-y-2">
                      <label
                        htmlFor="quick-harga"
                        className="text-base font-bold"
                      >
                        Harga per {quickTarget.bahan.nama_satuan} (Rp)
                      </label>

                      <Input
                        id="quick-harga"
                        type="number"
                        inputMode="numeric"
                        min="1"
                        step="1"
                        value={quickHarga}
                        onChange={(event) => {
                          setQuickHarga(event.target.value)
                          setQuickError("")
                        }}
                        placeholder="Contoh: 50000"
                        className="h-12 text-lg font-bold tabular-nums"
                        required
                        disabled={isSavingQuick}
                      />

                      {Number(quickHarga) > 0 && (
                        <p className="text-sm font-bold text-red-700 tabular-nums">
                          {formatCurrency(Number(quickHarga))} /{" "}
                          {quickTarget.bahan.nama_satuan}
                          {Number(quickJumlah) > 0 &&
                            ` • Total: ${formatCurrency(Math.round(Number(quickHarga) * Number(quickJumlah)))}`}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <label
                          htmlFor="quick-pemasok"
                          className="text-base font-bold"
                        >
                          Toko
                        </label>

                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          onClick={() => {
                            setShowNewPemasok((prev) => !prev)
                            setQuickError("")
                          }}
                          className="font-bold text-red-700"
                        >
                          <Store className="size-3.5" aria-hidden="true" />
                          <span>
                            {showNewPemasok ? "Pilih Toko Lama" : "+ Toko Baru"}
                          </span>
                        </Button>
                      </div>

                      {!showNewPemasok ? (
                        <Select
                          value={quickPemasok}
                          onValueChange={(val) => {
                            setQuickPemasok(val ?? "")
                            setQuickError("")
                          }}
                          items={pemasokList.map((p) => ({
                            label: p.nama_pemasok,
                            value: String(p.id_pemasok),
                          }))}
                        >
                          <SelectTrigger id="quick-pemasok" className="w-full">
                            <SelectValue placeholder="Pilih toko" />
                          </SelectTrigger>
                          <SelectContent>
                            {pemasokList.map((p) => (
                              <SelectItem
                                key={p.id_pemasok}
                                value={String(p.id_pemasok)}
                              >
                                {p.nama_pemasok}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="space-y-2.5 rounded-2xl border bg-stone-50 p-3">
                          <Input
                            value={newPemasokName}
                            onChange={(e) => {
                              setNewPemasokName(e.target.value)
                              setQuickError("")
                            }}
                            placeholder="Nama toko baru..."
                            disabled={isSavingPemasok || isSavingQuick}
                          />
                          <Input
                            type="tel"
                            value={newPemasokPhone}
                            onChange={(e) => setNewPemasokPhone(e.target.value)}
                            placeholder="No. HP toko (opsional)"
                            disabled={isSavingPemasok || isSavingQuick}
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => void handleAddInlinePemasok()}
                            disabled={isSavingPemasok || isSavingQuick}
                            className="w-full font-bold"
                          >
                            {isSavingPemasok
                              ? "Menambahkan..."
                              : "Pakai Toko Ini"}
                          </Button>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {quickError && (
                  <p
                    className="rounded-xl border border-red-300 bg-red-50 p-3 text-base font-bold text-red-700"
                    role="alert"
                  >
                    {quickError}
                  </p>
                )}

                <DialogFooter className="gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={() => setQuickTarget(null)}
                    disabled={isSavingQuick}
                  >
                    Batal
                  </Button>

                  <Button
                    type="submit"
                    size="lg"
                    disabled={isSavingQuick}
                  >
                    {isSavingQuick ? "Menyimpan..." : "Simpan"}
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
