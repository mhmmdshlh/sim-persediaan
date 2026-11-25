
import { useEffect, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import { getLaporan } from "@/services/laporan-service"

import type { LaporanResponse } from "@/types/laporan"

function formatDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number)

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day))
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatQuantity(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 2,
  }).format(amount)
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message
  }

  return "Tidak dapat terhubung ke server. Periksa koneksi dan coba lagi."
}

function getPeriodLabel(
  startDate: string | null,
  endDate: string | null,
): string {
  if (startDate && endDate) {
    return `${formatDate(startDate)} – ${formatDate(endDate)}`
  }

  if (startDate) {
    return `Mulai ${formatDate(startDate)}`
  }

  if (endDate) {
    return `Sampai ${formatDate(endDate)}`
  }

  return "Seluruh periode"
}

export function LaporanPage() {
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Laporan Persediaan
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Analisis pemakaian, harga pembelian, dan nilai persediaan.
          </p>
        </div>

        <Badge variant="outline">Data dari backend</Badge>
      </div>

      {pageError && !isLoading && (
        <div
          className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {pageError}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filter Periode</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label
                htmlFor="tanggal-mulai"
                className="text-sm font-medium"
              >
                Tanggal Mulai
              </label>

              <Input
                id="tanggal-mulai"
                type="date"
                value={startDate}
                max={endDate || undefined}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="tanggal-akhir"
                className="text-sm font-medium"
              >
                Tanggal Akhir
              </label>

              <Input
                id="tanggal-akhir"
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Kosongkan kedua tanggal untuk menampilkan seluruh transaksi.
            </p>

            <Button
              type="button"
              variant="outline"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              Muat Ulang
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Memuat laporan dari server...
          </CardContent>
        </Card>
      ) : report ? (
        <>
          <div>
            <p className="mb-3 text-sm text-muted-foreground">
              Periode transaksi:{" "}
              <span className="font-medium text-foreground">
                {getPeriodLabel(
                  report.periode.start_date,
                  report.periode.end_date,
                )}
              </span>
            </p>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">
                    Transaksi Masuk
                  </p>
                  <p className="mt-2 text-2xl font-bold">
                    {report.ringkasan.total_transaksi_masuk}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">
                    Transaksi Keluar
                  </p>
                  <p className="mt-2 text-2xl font-bold">
                    {report.ringkasan.total_transaksi_keluar}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">
                    Jenis Bahan Digunakan
                  </p>
                  <p className="mt-2 text-2xl font-bold">
                    {report.ringkasan.jenis_bahan_digunakan}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">
                    Pengeluaran Pembelian
                  </p>
                  <p className="mt-2 text-xl font-bold">
                    {formatCurrency(
                      report.ringkasan.total_pengeluaran_pembelian,
                    )}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">
                    Estimasi Biaya Pemakaian
                  </p>
                  <p className="mt-2 text-xl font-bold">
                    {formatCurrency(
                      report.ringkasan.total_estimasi_pemakaian,
                    )}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">
                    Nilai Persediaan Saat Ini
                  </p>
                  <p className="mt-2 text-xl font-bold">
                    {formatCurrency(
                      report.ringkasan.total_nilai_persediaan,
                    )}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Laporan Pemakaian Bahan
              </CardTitle>

              <p className="text-sm text-muted-foreground">
                Total penggunaan bahan berdasarkan transaksi keluar.
              </p>
            </CardHeader>

            <CardContent>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama Bahan</TableHead>
                      <TableHead>Total Pemakaian</TableHead>
                      <TableHead>Jumlah Transaksi</TableHead>
                      <TableHead>Estimasi Biaya</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {report.pemakaian_bahan.length > 0 ? (
                      report.pemakaian_bahan.map((item) => (
                        <TableRow key={item.id_bahan}>
                          <TableCell className="font-medium">
                            {item.nama_bahan}
                          </TableCell>

                          <TableCell>
                            {formatQuantity(item.total_jumlah)} {item.satuan}
                          </TableCell>

                          <TableCell>
                            {item.jumlah_transaksi}
                          </TableCell>

                          <TableCell className="whitespace-nowrap">
                            {formatCurrency(item.estimasi_biaya)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="h-24 text-center text-muted-foreground"
                        >
                          Belum ada data pemakaian bahan pada periode ini.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Ringkasan Harga Pembelian
              </CardTitle>

              <p className="text-sm text-muted-foreground">
                Perbandingan harga pembelian setiap bahan dalam periode terpilih.
              </p>
            </CardHeader>

            <CardContent>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama Bahan</TableHead>
                      <TableHead>Jumlah Pembelian</TableHead>
                      <TableHead>Terendah</TableHead>
                      <TableHead>Rata-rata</TableHead>
                      <TableHead>Tertinggi</TableHead>
                      <TableHead>Terakhir</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {report.ringkasan_harga_bahan.length > 0 ? (
                      report.ringkasan_harga_bahan.map((item) => (
                        <TableRow key={item.id_bahan}>
                          <TableCell className="font-medium">
                            {item.nama_bahan}
                          </TableCell>

                          <TableCell>{item.jumlah_pembelian}</TableCell>

                          <TableCell className="whitespace-nowrap">
                            {formatCurrency(item.harga_terendah)}
                          </TableCell>

                          <TableCell className="whitespace-nowrap">
                            {formatCurrency(item.harga_rata_rata)}
                          </TableCell>

                          <TableCell className="whitespace-nowrap">
                            {formatCurrency(item.harga_tertinggi)}
                          </TableCell>

                          <TableCell className="whitespace-nowrap">
                            {formatCurrency(item.harga_terakhir)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="h-24 text-center text-muted-foreground"
                        >
                          Belum ada data harga pembelian pada periode ini.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Riwayat Harga Pembelian
              </CardTitle>

              <p className="text-sm text-muted-foreground">
                Detail harga beli bahan berdasarkan transaksi masuk.
              </p>
            </CardHeader>

            <CardContent>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Nama Bahan</TableHead>
                      <TableHead>Pemasok</TableHead>
                      <TableHead>Jumlah</TableHead>
                      <TableHead>Harga Satuan</TableHead>
                      <TableHead>Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {report.riwayat_harga.length > 0 ? (
                      report.riwayat_harga.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="whitespace-nowrap">
                            {formatDate(item.tanggal)}
                          </TableCell>

                          <TableCell className="font-medium">
                            {item.nama_bahan}
                          </TableCell>

                          <TableCell>
                            {item.nama_pemasok ?? "-"}
                          </TableCell>

                          <TableCell className="whitespace-nowrap">
                            {formatQuantity(item.jumlah)} {item.satuan}
                          </TableCell>

                          <TableCell className="whitespace-nowrap">
                            {formatCurrency(item.harga_beli_satuan)}
                          </TableCell>

                          <TableCell className="whitespace-nowrap font-medium">
                            {formatCurrency(item.subtotal)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="h-24 text-center text-muted-foreground"
                        >
                          Belum ada riwayat pembelian pada periode ini.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base">
                  Nilai Persediaan Saat Ini
                </CardTitle>

                <Badge variant="outline">
                  Harga Beli Terakhir
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground">
                {report.nilai_persediaan.keterangan}
              </p>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">
                  Total Nilai Persediaan
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {formatCurrency(report.nilai_persediaan.total_nilai)}
                </p>
              </div>

              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama Bahan</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Stok Saat Ini</TableHead>
                      <TableHead>Harga Terakhir</TableHead>
                      <TableHead>Nilai Persediaan</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {report.nilai_persediaan.items.length > 0 ? (
                      report.nilai_persediaan.items.map((item) => (
                        <TableRow key={item.id_bahan}>
                          <TableCell className="font-medium">
                            {item.nama_bahan}
                          </TableCell>

                          <TableCell>{item.nama_kategori}</TableCell>

                          <TableCell className="whitespace-nowrap">
                            {formatQuantity(item.stok_saat_ini)} {item.satuan}
                          </TableCell>

                          <TableCell className="whitespace-nowrap">
                            {formatCurrency(item.harga_terakhir)}
                          </TableCell>

                          <TableCell className="whitespace-nowrap font-medium">
                            {formatCurrency(item.nilai_persediaan)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="h-24 text-center text-muted-foreground"
                        >
                          Belum ada bahan aktif.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {report.nilai_persediaan.per_kategori.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">
                    Nilai Persediaan per Kategori
                  </h3>

                  <div className="overflow-x-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Kategori</TableHead>
                          <TableHead>Jumlah Bahan</TableHead>
                          <TableHead>Total Nilai</TableHead>
                        </TableRow>
                      </TableHeader>

                      <TableBody>
                        {report.nilai_persediaan.per_kategori.map((item) => (
                          <TableRow key={item.id_kategori}>
                            <TableCell className="font-medium">
                              {item.nama_kategori}
                            </TableCell>

                            <TableCell>{item.jumlah_bahan}</TableCell>

                            <TableCell className="whitespace-nowrap">
                              {formatCurrency(item.total_nilai)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base">
                  Daftar Saran Belanja
                </CardTitle>

                <Badge variant="outline">
                  {report.daftar_belanja.weekend_mode
                    ? "Mode Persiapan Akhir Pekan"
                    : "Mode Normal"}
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground">
                {report.daftar_belanja.alasan}
              </p>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">
                  Estimasi Total Belanja
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {formatCurrency(
                    report.daftar_belanja.estimasi_total_biaya,
                  )}
                </p>
              </div>

              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama Bahan</TableHead>
                      <TableHead>Stok Saat Ini</TableHead>
                      <TableHead>Stok Minimum</TableHead>
                      <TableHead>Saran Pembelian</TableHead>
                      <TableHead>Pemasok Terakhir</TableHead>
                      <TableHead>Estimasi Biaya</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {report.daftar_belanja.items.length > 0 ? (
                      report.daftar_belanja.items.map((item) => (
                        <TableRow key={item.id_bahan}>
                          <TableCell className="font-medium">
                            {item.nama_bahan}
                          </TableCell>

                          <TableCell className="whitespace-nowrap">
                            {formatQuantity(item.stok_saat_ini)} {item.satuan}
                          </TableCell>

                          <TableCell className="whitespace-nowrap">
                            {formatQuantity(item.stok_minimum)} {item.satuan}
                          </TableCell>

                          <TableCell className="whitespace-nowrap font-medium">
                            {formatQuantity(item.saran_jumlah_beli)} {item.satuan}
                          </TableCell>

                          <TableCell>
                            {item.pemasok_terakhir ? (
                              <div>
                                <p>{item.pemasok_terakhir.nama_pemasok}</p>
                                <p className="text-xs text-muted-foreground">
                                  {item.pemasok_terakhir.no_telepon || "-"}
                                </p>
                              </div>
                            ) : (
                              "-"
                            )}
                          </TableCell>

                          <TableCell className="whitespace-nowrap">
                            {formatCurrency(item.estimasi_biaya)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="h-24 text-center text-muted-foreground"
                        >
                          Tidak ada bahan yang perlu dibeli saat ini.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Laporan belum tersedia.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
