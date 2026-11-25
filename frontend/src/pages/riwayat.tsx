
import { useEffect, useState } from "react"
import { Eye, Search } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { getTransaksiList } from "@/services/transaksi-service"

import type { TransaksiResponse } from "@/types/transaksi"

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

export function RiwayatPage() {
  const [transactions, setTransactions] = useState<TransaksiResponse[]>([])
  const [search, setSearch] = useState("")
  const [selectedTransaction, setSelectedTransaction] =
    useState<TransaksiResponse | null>(null)

  const [loadedRequest, setLoadedRequest] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [pageError, setPageError] = useState("")

  const requestKey = `${search}\u0000${refreshKey}`
  const isLoading = loadedRequest !== requestKey

  useEffect(() => {
    let isActive = true

    getTransaksiList({
      page: 1,
      page_size: 100,
      search,
    })
      .then((data) => {
        if (!isActive) return

        setTransactions(data)
        setPageError("")
        setLoadedRequest(requestKey)
      })
      .catch((error: unknown) => {
        if (!isActive) return

        setTransactions([])
        setPageError(getErrorMessage(error))
        setLoadedRequest(requestKey)
      })

    return () => {
      isActive = false
    }
  }, [search, refreshKey, requestKey])

  const totalTransaksi = transactions.length

  function handleRefresh() {
    setRefreshKey((current) => current + 1)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Riwayat Transaksi
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Lihat catatan barang masuk dan keluar.
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
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari ID, pemasok, atau catatan..."
                className="pl-9"
              />
            </div>

            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              Muat Ulang
            </Button>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Transaksi</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead>Pemasok</TableHead>
                  <TableHead>Jumlah Bahan</TableHead>
                  <TableHead>Total Pembelian</TableHead>
                  <TableHead className="text-right">Detail</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Memuat riwayat transaksi...
                    </TableCell>
                  </TableRow>
                ) : transactions.length > 0 ? (
                  transactions.map((transaction) => (
                    <TableRow key={transaction.id_transaksi}>
                      <TableCell className="font-mono text-xs">
                        {transaction.id_transaksi.slice(0, 8)}
                      </TableCell>

                      <TableCell className="whitespace-nowrap">
                        {formatDate(transaction.waktu_transaksi)}
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant={
                            transaction.jenis_transaksi === "masuk"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {transaction.jenis_transaksi === "masuk"
                            ? "Masuk"
                            : "Keluar"}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        {transaction.nama_pemasok ?? "-"}
                      </TableCell>

                      <TableCell>
                        {transaction.detail.length} jenis bahan
                      </TableCell>

                      <TableCell className="whitespace-nowrap">
                        {transaction.jenis_transaksi === "masuk"
                          ? formatCurrency(transaction.total_pembelian)
                          : "-"}
                      </TableCell>

                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedTransaction(transaction)}
                        >
                          <Eye className="size-4" />
                          Detail
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-24 text-center text-muted-foreground"
                    >
                      {pageError
                        ? "Riwayat transaksi tidak dapat dimuat."
                        : search.trim()
                          ? "Tidak ada transaksi yang cocok dengan pencarian."
                          : "Belum ada transaksi."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <p className="text-xs text-muted-foreground">
            Menampilkan {totalTransaksi} transaksi.
            {totalTransaksi === 100 &&
              " Hanya 100 transaksi pertama yang ditampilkan."}
          </p>
        </CardContent>
      </Card>

      <Dialog
        open={selectedTransaction !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedTransaction(null)
        }}
      >
        <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Detail Transaksi</DialogTitle>

            <DialogDescription>
              Informasi lengkap transaksi persediaan.
            </DialogDescription>
          </DialogHeader>

          {selectedTransaction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="col-span-2">
                  <p className="text-muted-foreground">ID Transaksi</p>
                  <p className="break-all font-mono text-xs font-medium">
                    {selectedTransaction.id_transaksi}
                  </p>
                </div>

                <div>
                  <p className="text-muted-foreground">Tanggal</p>
                  <p className="font-medium">
                    {formatDate(selectedTransaction.waktu_transaksi)}
                  </p>
                </div>

                <div>
                  <p className="text-muted-foreground">Jenis Transaksi</p>
                  <p className="font-medium">
                    {selectedTransaction.jenis_transaksi === "masuk"
                      ? "Barang Masuk"
                      : "Barang Keluar"}
                  </p>
                </div>

                {selectedTransaction.nama_pemasok && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Pemasok</p>
                    <p className="font-medium">
                      {selectedTransaction.nama_pemasok}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Detail Bahan</h3>

                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bahan</TableHead>
                        <TableHead>Jumlah</TableHead>

                        {selectedTransaction.jenis_transaksi === "masuk" && (
                          <>
                            <TableHead>Harga Satuan</TableHead>
                            <TableHead>Subtotal</TableHead>
                          </>
                        )}
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {selectedTransaction.detail.map((detail) => (
                        <TableRow key={detail.id_bahan}>
                          <TableCell>
                            <p className="font-medium">{detail.nama_bahan}</p>
                            <p className="text-xs text-muted-foreground">
                              {detail.satuan}
                            </p>
                          </TableCell>

                          <TableCell className="whitespace-nowrap">
                            {formatQuantity(detail.jumlah)} {detail.satuan}
                          </TableCell>

                          {selectedTransaction.jenis_transaksi === "masuk" && (
                            <>
                              <TableCell className="whitespace-nowrap">
                                {detail.harga_beli_satuan !== null
                                  ? formatCurrency(detail.harga_beli_satuan)
                                  : "-"}
                              </TableCell>

                              <TableCell className="whitespace-nowrap">
                                {formatCurrency(detail.subtotal)}
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {selectedTransaction.jenis_transaksi === "masuk" && (
                <div className="flex justify-between border-t pt-3 text-sm font-semibold">
                  <span>Total Pembelian</span>
                  <span>
                    {formatCurrency(selectedTransaction.total_pembelian)}
                  </span>
                </div>
              )}

              <div className="space-y-1">
                <p className="text-sm font-medium">Catatan</p>
                <p className="text-sm text-muted-foreground">
                  {selectedTransaction.catatan || "Tidak ada catatan."}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
