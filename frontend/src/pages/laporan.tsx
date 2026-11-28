import { useEffect, useState } from "react"
import { RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  formatCurrency,
  formatDateShort,
  formatQuantity,
  getErrorMessage,
} from "@/lib/format"
import { getLaporan } from "@/services/laporan-service"

import type { LaporanResponse } from "@/types/laporan"

type LaporanTab = "pemakaian" | "harga" | "nilai" | "belanja"

const DONUT_COLORS = [
  "#dc2626", // red-600
  "#ea580c", // orange-600
  "#f59e0b", // amber-500
  "#78716c", // stone-500
]

export function LaporanPage() {
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [activeTab, setActiveTab] = useState<LaporanTab>("pemakaian")
  const [selectedPriceMaterialId, setSelectedPriceMaterialId] = useState<
    number | null
  >(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const [report, setReport] = useState<LaporanResponse | null>(null)
  const [loadedRequest, setLoadedRequest] = useState<string | null>(null)
  const [pageError, setPageError] = useState("")

  const requestKey = `${startDate}|${endDate}|${refreshKey}`
  const isLoading = loadedRequest !== requestKey

  useEffect(() => {
    let isActive = true

    getLaporan({
      start_date: startDate || undefined,
      end_date: endDate || undefined,
    })
      .then((data) => {
        if (!isActive) return

        setReport(data)
        const cabaiOrFirst =
          data.ringkasan_harga_bahan.find((b) =>
            b.nama_bahan.toLowerCase().includes("cabai"),
          ) ?? data.ringkasan_harga_bahan[0]
        setSelectedPriceMaterialId(cabaiOrFirst?.id_bahan ?? null)
        setPageError("")
        setLoadedRequest(requestKey)
      })
      .catch((error: unknown) => {
        if (!isActive) return

        setReport(null)
        setPageError(getErrorMessage(error))
        setLoadedRequest(requestKey)
      })

    return () => {
      isActive = false
    }
  }, [startDate, endDate, refreshKey, requestKey])

  function handleRefresh() {
    setRefreshKey((current) => current + 1)
  }

  const tabs: { id: LaporanTab; label: string }[] = [
    { id: "pemakaian", label: "Bahan Boros" },
    { id: "harga", label: "Tren Harga" },
    { id: "nilai", label: "Nilai Stok" },
    { id: "belanja", label: "Saran Beli" },
  ]

  // Data Grafik 1: Ranking Horizontal Pemakaian Bahan (Siapa paling banyak makan biaya)
  const totalUsageCost =
    report?.pemakaian_bahan.reduce((sum, i) => sum + i.estimasi_biaya, 0) || 1
  const maxUsageCost =
    report && report.pemakaian_bahan.length > 0
      ? Math.max(...report.pemakaian_bahan.map((i) => i.estimasi_biaya), 1)
      : 1

  // Data Grafik 2: Line Chart Tren Harga Beli per Bahan dari waktu ke waktu
  const activePriceMaterialId =
    selectedPriceMaterialId ??
    report?.ringkasan_harga_bahan[0]?.id_bahan ??
    null
  const priceHistoryForMaterial = report
    ? [...report.riwayat_harga]
        .filter((h) => h.id_bahan === activePriceMaterialId)
        .reverse()
    : []
  const selectedPriceSummary = report?.ringkasan_harga_bahan.find(
    (s) => s.id_bahan === activePriceMaterialId,
  )

  // Data Grafik 3: Donut Chart Komposisi Nilai Stok per Kategori
  const totalNilaiStok = report?.nilai_persediaan.total_nilai || 1
  const kategoriSlices = report
    ? report.nilai_persediaan.per_kategori.map((kat, idx) => ({
        ...kat,
        pct: Math.round((kat.total_nilai / totalNilaiStok) * 100),
        color: DONUT_COLORS[idx % DONUT_COLORS.length],
      }))
    : []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-extrabold tracking-tight text-stone-900">
          Laporan Usaha
        </h1>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading}
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          <span>Segarkan</span>
        </Button>
      </div>

      {/* Filter Tanggal */}
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label
            htmlFor="tanggal-mulai"
            className="text-xs font-extrabold text-stone-600"
          >
            Dari Tanggal
          </label>
          <Input
            id="tanggal-mulai"
            type="date"
            value={startDate}
            max={endDate || undefined}
            onChange={(event) => setStartDate(event.target.value)}
            className="mt-1 bg-white"
          />
        </div>

        <div>
          <label
            htmlFor="tanggal-akhir"
            className="text-xs font-extrabold text-stone-600"
          >
            Sampai Tanggal
          </label>
          <Input
            id="tanggal-akhir"
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(event) => setEndDate(event.target.value)}
            className="mt-1 bg-white"
          />
        </div>
      </div>

      {pageError && !isLoading && (
        <div
          className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-bold text-red-700"
          role="alert"
        >
          {pageError}
        </div>
      )}

      {isLoading ? (
        <div className="py-12 text-center text-base font-medium text-stone-500">
          Memuat...
        </div>
      ) : report ? (
        <>
          {/* 4 Tab Tombol di PALING ATAS (Langsung pilih grafik/laporan yang mau dilihat) */}
          <div
            role="tablist"
            aria-label="Jenis laporan"
            className="grid grid-cols-2 gap-2 sm:grid-cols-4"
          >
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                variant={activeTab === tab.id ? "default" : "outline"}
                onClick={() => setActiveTab(tab.id)}
                className="w-full font-extrabold"
              >
                {tab.label}
              </Button>
            ))}
          </div>

          {/* =========================================================
              TAB 1: GRAFIK PERINGKAT BAHAN PALING BANYAK TERPAKAI (Horizontal Bar Chart)
             ========================================================= */}
          {activeTab === "pemakaian" && (
            <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-xs">
              <div className="mb-4">
                <h2 className="text-lg font-extrabold text-stone-900">
                  Peringkat Biaya Pemakaian Bahan
                </h2>
                <p className="text-xs font-medium text-stone-500">
                  Urutan bahan yang paling banyak menyerap biaya produksi
                </p>
              </div>

              {report.pemakaian_bahan.length > 0 ? (
                <div className="space-y-4">
                  {report.pemakaian_bahan.map((item, idx) => {
                    const widthPct = Math.max(
                      6,
                      Math.round((item.estimasi_biaya / maxUsageCost) * 100),
                    )
                    const sharePct = Math.round(
                      (item.estimasi_biaya / totalUsageCost) * 100,
                    )

                    return (
                      <div key={item.id_bahan} className="space-y-1.5">
                        <div className="flex items-baseline justify-between gap-2">
                          <div className="min-w-0">
                            <span className="mr-2 inline-flex size-5 items-center justify-center rounded-full bg-red-100 text-xs font-extrabold text-red-800">
                              {idx + 1}
                            </span>
                            <span className="text-base font-extrabold text-stone-900">
                              {item.nama_bahan}
                            </span>
                            <span className="ml-1.5 text-xs font-semibold text-stone-500">
                              ({formatQuantity(item.total_jumlah)}{" "}
                              {item.satuan})
                            </span>
                          </div>

                          <div className="shrink-0 text-right">
                            <span className="text-sm font-black text-stone-900 tabular-nums">
                              {formatCurrency(item.estimasi_biaya)}
                            </span>
                            <span className="ml-1.5 rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-extrabold text-orange-900 tabular-nums">
                              {sharePct}%
                            </span>
                          </div>
                        </div>

                        <div className="h-3.5 w-full overflow-hidden rounded-full bg-stone-100">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-red-600 to-orange-500 transition-all"
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="py-8 text-center text-sm font-semibold text-stone-500">
                  Belum ada catatan pemakaian bahan.
                </p>
              )}
            </div>
          )}

          {/* =========================================================
              TAB 2: GRAFIK GARIS (LINE CHART) NAIK-TURUN HARGA BELI
              Menjawab langsung masalah wawancara: harga Cabai / Ayam yang fluktuatif
             ========================================================= */}
          {activeTab === "harga" && (
            <div className="space-y-4">
              <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-xs">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-extrabold text-stone-900">
                      Grafik Naik-Turun Harga Beli
                    </h2>
                    <p className="text-xs font-medium text-stone-500">
                      Pilih bahan untuk melihat riwayat perubahan harganya
                    </p>
                  </div>

                  {/* Dropdown Pilihan Bahan (Rapi 1 baris, tidak menumpuk) */}
                  <div className="w-full sm:w-64">
                    <Select
                      value={
                        activePriceMaterialId !== null
                          ? String(activePriceMaterialId)
                          : ""
                      }
                      onValueChange={(val) =>
                        setSelectedPriceMaterialId(val ? Number(val) : null)
                      }
                      items={report.ringkasan_harga_bahan.map((item) => ({
                        label: item.nama_bahan,
                        value: String(item.id_bahan),
                      }))}
                    >
                      <SelectTrigger className="w-full font-bold">
                        <SelectValue placeholder="Pilih bahan" />
                      </SelectTrigger>
                      <SelectContent>
                        {report.ringkasan_harga_bahan.map((item) => (
                          <SelectItem
                            key={item.id_bahan}
                            value={String(item.id_bahan)}
                          >
                            {item.nama_bahan}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* SVG Line Chart Responsif */}
                {priceHistoryForMaterial.length > 0 && selectedPriceSummary ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-2 rounded-2xl bg-stone-50 p-3 text-center text-xs">
                      <div>
                        <p className="font-semibold text-stone-500">Termurah</p>
                        <p className="mt-0.5 text-sm font-black text-emerald-700 tabular-nums">
                          {formatCurrency(selectedPriceSummary.harga_terendah)}
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-stone-500">
                          Rata-rata
                        </p>
                        <p className="mt-0.5 text-sm font-black text-stone-900 tabular-nums">
                          {formatCurrency(selectedPriceSummary.harga_rata_rata)}
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-stone-500">Termahal</p>
                        <p className="mt-0.5 text-sm font-black text-red-700 tabular-nums">
                          {formatCurrency(selectedPriceSummary.harga_tertinggi)}
                        </p>
                      </div>
                    </div>

                    {(() => {
                      const pts = priceHistoryForMaterial
                      const minP = Math.min(
                        ...pts.map((p) => p.harga_beli_satuan),
                      )
                      const maxP = Math.max(
                        ...pts.map((p) => p.harga_beli_satuan),
                      )
                      const range = Math.max(maxP - minP, 1)

                      const width = 320
                      const height = 140
                      const padX = 28
                      const padY = 26

                      const coords = pts.map((pt, i) => {
                        const x =
                          pts.length === 1
                            ? width / 2
                            : padX +
                              (i / (pts.length - 1)) * (width - padX * 2)
                        const y =
                          maxP === minP
                            ? height / 2
                            : padY +
                              (1 - (pt.harga_beli_satuan - minP) / range) *
                                (height - padY * 2)
                        return { x, y, pt }
                      })

                      const polylinePoints = coords
                        .map((c) => `${c.x},${c.y}`)
                        .join(" ")
                      const areaPoints = `${coords[0].x},${height - 10} ${polylinePoints} ${coords[coords.length - 1].x},${height - 10}`

                      return (
                        <div className="rounded-2xl border border-stone-200/80 bg-stone-50/50 p-3">
                          <svg
                            viewBox={`0 0 ${width} ${height}`}
                            className="h-44 w-full overflow-visible"
                            role="img"
                            aria-label={`Grafik tren harga ${selectedPriceSummary.nama_bahan}`}
                          >
                            <defs>
                              <linearGradient
                                id="fireLineFill"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                              >
                                <stop
                                  offset="0%"
                                  stopColor="#dc2626"
                                  stopOpacity="0.22"
                                />
                                <stop
                                  offset="100%"
                                  stopColor="#dc2626"
                                  stopOpacity="0.0"
                                />
                              </linearGradient>
                            </defs>

                            {/* Garis bantu atas & bawah */}
                            <line
                              x1={padX}
                              y1={padY}
                              x2={width - padX}
                              y2={padY}
                              stroke="#e7e5e4"
                              strokeDasharray="4 4"
                            />
                            <line
                              x1={padX}
                              y1={height - padY}
                              x2={width - padX}
                              y2={height - padY}
                              stroke="#e7e5e4"
                              strokeDasharray="4 4"
                            />

                            {coords.length > 1 && (
                              <>
                                <polygon
                                  points={areaPoints}
                                  fill="url(#fireLineFill)"
                                />
                                <polyline
                                  fill="none"
                                  stroke="#dc2626"
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  points={polylinePoints}
                                />
                              </>
                            )}

                            {coords.map((c, idx) => (
                              <g key={idx}>
                                <circle
                                  cx={c.x}
                                  cy={c.y}
                                  r="5"
                                  fill="#ffffff"
                                  stroke="#dc2626"
                                  strokeWidth="3"
                                />
                                <text
                                  x={c.x}
                                  y={c.y - 10}
                                  textAnchor="middle"
                                  className="fill-stone-900 text-[10px] font-extrabold"
                                >
                                  {Math.round(c.pt.harga_beli_satuan / 1000)}rb
                                </text>
                                <text
                                  x={c.x}
                                  y={height - 2}
                                  textAnchor="middle"
                                  className="fill-stone-500 text-[9px] font-bold"
                                >
                                  {formatDateShort(c.pt.tanggal)}
                                </text>
                              </g>
                            ))}
                          </svg>
                        </div>
                      )
                    })()}
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm font-semibold text-stone-500">
                    Belum ada riwayat harga untuk bahan ini.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* =========================================================
              TAB 3: GRAFIK DONUT KOMPOSISI NILAI STOK PER KATEGORI
              <= 3 Kategori (Bahan Utama, Bumbu, Kemasan) — sangat ideal untuk Donut Chart
             ========================================================= */}
          {activeTab === "nilai" && (
            <div className="space-y-4">
              {kategoriSlices.length > 0 && (
                <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-xs">
                  <h2 className="text-lg font-extrabold text-stone-900">
                    Komposisi Nilai Stok per Kategori
                  </h2>
                  <p className="text-xs font-medium text-stone-500">
                    Proporsi modal yang tersimpan di Bahan Utama, Bumbu, dan
                    Kemasan
                  </p>

                  <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row sm:justify-around">
                    {/* SVG Donut Chart */}
                    {(() => {
                      const radius = 54
                      const circumference = 2 * Math.PI * radius
                      let cumulativeRatio = 0

                      return (
                        <div className="relative flex size-40 shrink-0 items-center justify-center">
                          <svg
                            viewBox="0 0 140 140"
                            className="size-full -rotate-90"
                            role="img"
                            aria-label="Grafik donat nilai stok per kategori"
                          >
                            <circle
                              cx="70"
                              cy="70"
                              r={radius}
                              fill="transparent"
                              stroke="#f5f5f4"
                              strokeWidth="18"
                            />
                            {kategoriSlices.map((slice) => {
                              const ratio =
                                slice.total_nilai / totalNilaiStok
                              const dash = ratio * circumference
                              const offset = -cumulativeRatio * circumference
                              cumulativeRatio += ratio

                              return (
                                <circle
                                  key={slice.id_kategori}
                                  cx="70"
                                  cy="70"
                                  r={radius}
                                  fill="transparent"
                                  stroke={slice.color}
                                  strokeWidth="18"
                                  strokeDasharray={`${dash} ${circumference}`}
                                  strokeDashoffset={offset}
                                />
                              )
                            })}
                          </svg>

                          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                            <span className="text-[11px] font-bold text-stone-500">
                              Total Stok
                            </span>
                            <span className="text-xs font-black text-stone-900 tabular-nums">
                              {formatCurrency(
                                report.nilai_persediaan.total_nilai,
                              )}
                            </span>
                          </div>
                        </div>
                      )
                    })()}

                    {/* Legenda Kategori */}
                    <div className="w-full flex-1 space-y-2.5">
                      {kategoriSlices.map((slice) => (
                        <div
                          key={slice.id_kategori}
                          className="flex items-center justify-between rounded-2xl bg-stone-50 px-3.5 py-2.5"
                        >
                          <div className="flex items-center gap-2.5">
                            <span
                              className="size-3.5 shrink-0 rounded-full"
                              style={{ backgroundColor: slice.color }}
                            />
                            <div>
                              <p className="text-sm font-extrabold text-stone-900">
                                {slice.nama_kategori}
                              </p>
                              <p className="text-xs font-medium text-stone-500">
                                {slice.jumlah_bahan} jenis bahan
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="text-sm font-black text-stone-900 tabular-nums">
                              {formatCurrency(slice.total_nilai)}
                            </p>
                            <p className="text-xs font-extrabold text-red-700 tabular-nums">
                              {slice.pct}%
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Daftar Nilai per Bahan */}
              <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,18rem),1fr))] gap-3">
                {report.nilai_persediaan.items.map((item) => (
                  <div
                    key={item.id_bahan}
                    className="flex items-center justify-between rounded-2xl border border-stone-200 bg-white p-4 shadow-2xs"
                  >
                    <div>
                      <p className="text-base font-extrabold text-stone-900">
                        {item.nama_bahan}
                      </p>
                      <p className="text-xs font-semibold text-stone-500">
                        {formatQuantity(item.stok_saat_ini)} {item.satuan} ×{" "}
                        {formatCurrency(item.harga_terakhir)}
                      </p>
                    </div>

                    <p className="text-base font-extrabold text-stone-900 tabular-nums">
                      {formatCurrency(item.nilai_persediaan)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: SARAN BELANJA */}
          {activeTab === "belanja" && (
            <div className="space-y-3">
              {report.daftar_belanja.items.length > 0 ? (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,18rem),1fr))] gap-3">
                  {report.daftar_belanja.items.map((item) => (
                    <div
                      key={item.id_bahan}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-2xs"
                    >
                      <div className="min-w-0">
                        <p className="text-base font-extrabold text-stone-900">
                          {item.nama_bahan}
                        </p>
                        <p className="text-xs font-semibold text-stone-500">
                          Sisa {formatQuantity(item.stok_saat_ini)}{" "}
                          {item.satuan} •{" "}
                          {item.pemasok_terakhir?.nama_pemasok ?? "-"}
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        <span className="inline-block whitespace-nowrap rounded-full bg-red-100 px-3 py-1 text-xs font-extrabold text-red-900">
                          Beli {formatQuantity(item.saran_jumlah_beli)}{" "}
                          {item.satuan}
                        </span>
                        <p className="mt-1 text-xs font-bold text-stone-600 tabular-nums">
                          ≈ {formatCurrency(item.estimasi_biaya)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border bg-white py-8 text-center text-sm font-semibold text-stone-500">
                  Semua stok bahan masih aman.
                </div>
              )}

              <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
                <p className="text-xs font-bold text-amber-900">
                  Perkiraan Uang Belanja
                </p>
                <p className="mt-1 text-xl font-black text-stone-900 tabular-nums">
                  {formatCurrency(report.daftar_belanja.estimasi_total_biaya)}
                </p>
              </div>
            </div>
          )}

          {/* 3 Ringkasan Total Uang di BAWAH */}
          <div className="grid grid-cols-1 gap-2.5 pt-2 sm:grid-cols-3">
            <div className="rounded-2xl border border-stone-200 bg-white p-3.5 shadow-2xs">
              <p className="text-xs font-bold text-stone-500">
                Total Uang Belanja
              </p>
              <p className="mt-1 text-xl font-black text-stone-900 tabular-nums">
                {formatCurrency(
                  report.ringkasan.total_pengeluaran_pembelian,
                )}
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-3.5 shadow-2xs">
              <p className="text-xs font-bold text-stone-500">
                Biaya Bahan Terpakai
              </p>
              <p className="mt-1 text-xl font-black text-red-700 tabular-nums">
                {formatCurrency(report.ringkasan.total_estimasi_pemakaian)}
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-3.5 shadow-2xs">
              <p className="text-xs font-bold text-stone-500">
                Nilai Sisa Stok
              </p>
              <p className="mt-1 text-xl font-black text-amber-700 tabular-nums">
                {formatCurrency(report.ringkasan.total_nilai_persediaan)}
              </p>
            </div>
          </div>
        </>
      ) : (
        <div className="py-12 text-center text-base font-medium text-stone-500">
          Laporan belum tersedia.
        </div>
      )}
    </div>
  )
}
