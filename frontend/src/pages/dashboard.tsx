import { useEffect, useState } from "react"
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Package,
  RefreshCw,
} from "lucide-react"

import { ApiError } from "@/services/api"
import { getDashboard } from "@/services/dashboard-service"

import type { DashboardResponse } from "@/types/dashboard"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

function formatDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number)

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day))
}

function formatQuantity(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 2,
  }).format(value)
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value)
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message
  }

  return "Tidak dapat terhubung ke server. Periksa koneksi dan coba lagi."
}

function getTransactionLabel(
  transaction: DashboardResponse["transaksi_terbaru"][number],
): string {
  if (transaction.jenis_transaksi === "masuk") {
    return transaction.nama_pemasok
      ? `Pembelian dari ${transaction.nama_pemasok}`
      : transaction.catatan || "Barang masuk"
  }

  return transaction.catatan || "Penggunaan bahan"
}

export function DashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null)
  const [loadedRefreshKey, setLoadedRefreshKey] = useState<number | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [pageError, setPageError] = useState("")

  const isLoading = loadedRefreshKey !== refreshKey

  useEffect(() => {
    let isActive = true

    getDashboard()
      .then((data) => {
        if (!isActive) return

        setDashboard(data)
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

  const summaryCards = dashboard
    ? [
        {
          title: "Jenis Bahan Aktif",
          value: dashboard.ringkasan.total_bahan_aktif,
          description: "Bahan terdaftar dan aktif",
          icon: Package,
        },
        {
          title: "Perlu Perhatian",
          value: dashboard.ringkasan.stok_menipis,
          description: `${dashboard.ringkasan.stok_habis} bahan sudah habis`,
          icon: AlertTriangle,
        },
        {
          title: "Barang Masuk",
          value: dashboard.ringkasan.barang_masuk_hari_ini,
          description: "Transaksi hari ini",
          icon: ArrowDownToLine,
        },
        {
          title: "Barang Keluar",
          value: dashboard.ringkasan.barang_keluar_hari_ini,
          description: "Transaksi hari ini",
          icon: ArrowUpFromLine,
        },
      ]
    : []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Dashboard
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Ringkasan kondisi persediaan bahan baku usaha.
          </p>

          {dashboard && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">
                Data per {formatDate(dashboard.tanggal_wib)}
              </span>

              <Badge variant="outline">
                {dashboard.is_pre_weekend
                  ? "Mode Persiapan Akhir Pekan"
                  : "Mode Normal"}
              </Badge>
            </div>
          )}
        </div>

        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={isLoading}
        >
          <RefreshCw className="size-4" />
          Muat Ulang
        </Button>
      </div>

      {pageError && (
        <div
          className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {pageError}
        </div>
      )}

      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Memuat data Dashboard...
          </CardContent>
        </Card>
      ) : dashboard ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((item) => {
              const Icon = item.icon

              return (
                <Card key={item.title}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {item.title}
                    </CardTitle>

                    <Icon className="size-4 text-muted-foreground" />
                  </CardHeader>

                  <CardContent>
                    <div className="text-2xl font-bold">
                      {item.value}
                    </div>

                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Persediaan Menipis
                </CardTitle>

                <p className="text-sm text-muted-foreground">
                  Bahan yang sudah habis atau berada di bawah batas minimum.
                </p>
              </CardHeader>

              <CardContent>
                {dashboard.stok_menipis.length > 0 ? (
                  <div className="space-y-4">
                    {dashboard.stok_menipis.map((item) => (
                      <div
                        key={item.id_bahan}
                        className="flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium">
                            {item.nama_bahan}
                          </p>

                          <p className="text-xs text-muted-foreground">
                            Minimum: {formatQuantity(item.stok_minimum)}{" "}
                            {item.satuan}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-3">
                          <span className="text-sm font-medium">
                            {formatQuantity(item.stok_saat_ini)}{" "}
                            {item.satuan}
                          </span>

                          <Badge
                            variant="outline"
                            className={
                              item.status === "habis"
                                ? "border-red-300 bg-red-50 text-red-700"
                                : "border-amber-300 bg-amber-50 text-amber-700"
                            }
                          >
                            {item.status === "habis" ? "Habis" : "Menipis"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Tidak ada bahan yang perlu diperiksa.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Transaksi Terbaru
                </CardTitle>

                <p className="text-sm text-muted-foreground">
                  Lima transaksi persediaan terakhir.
                </p>
              </CardHeader>

              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Transaksi</TableHead>
                        <TableHead>Jenis</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {dashboard.transaksi_terbaru.length > 0 ? (
                        dashboard.transaksi_terbaru.map((transaction) => (
                          <TableRow key={transaction.id_transaksi}>
                            <TableCell className="whitespace-nowrap text-xs">
                              {formatDate(transaction.waktu_transaksi)}
                            </TableCell>

                            <TableCell>
                              <p className="text-sm font-medium">
                                {getTransactionLabel(transaction)}
                              </p>

                              <p className="text-xs text-muted-foreground">
                                {transaction.jumlah_jenis_bahan} jenis bahan
                              </p>

                              {transaction.jenis_transaksi === "masuk" && (
                                <p className="text-xs text-muted-foreground">
                                  {formatCurrency(transaction.total_pembelian)}
                                </p>
                              )}
                            </TableCell>

                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  transaction.jenis_transaksi === "masuk"
                                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                                    : "border-slate-300 bg-slate-50 text-slate-700"
                                }
                              >
                                {transaction.jenis_transaksi === "masuk"
                                  ? "Masuk"
                                  : "Keluar"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={3}
                            className="h-24 text-center text-muted-foreground"
                          >
                            Belum ada transaksi.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Data Dashboard belum tersedia.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
