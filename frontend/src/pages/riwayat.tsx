import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, RefreshCw, Search, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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

import {
  formatCurrency,
  formatDate,
  formatQuantity,
  getErrorMessage,
} from "@/lib/format"
import type { PaginationMeta } from "@/services/api"
import {
  deleteTransaksi,
  getTransaksiList,
} from "@/services/transaksi-service"

import type { TransaksiResponse } from "@/types/transaksi"

export function RiwayatPage() {
  const [transactions, setTransactions] = useState<TransaksiResponse[]>([])
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    page_size: 25,
    total_items: 0,
    total_pages: 1,
  })
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [selectedTransaction, setSelectedTransaction] =
    useState<TransaksiResponse | null>(null)

  const [loadedRequest, setLoadedRequest] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [pageError, setPageError] = useState("")
  const [deleteError, setDeleteError] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)

  const requestKey = `${page}\u0000${search}\u0000${refreshKey}`
  const isLoading = loadedRequest !== requestKey

  useEffect(() => {
    let isActive = true

    const timer = window.setTimeout(() => {
      getTransaksiList({
        page,
        page_size: 25,
        search,
      })
        .then((result) => {
          if (!isActive) return

          setTransactions(result.items)
          setPagination(result.pagination)
          setPageError("")
          setLoadedRequest(requestKey)
        })
        .catch((error: unknown) => {
          if (!isActive) return

          setTransactions([])
          setPageError(getErrorMessage(error))
          setLoadedRequest(requestKey)
        })
    }, 200)

    return () => {
      isActive = false
      window.clearTimeout(timer)
    }
  }, [page, search, refreshKey, requestKey])

  function handleRefresh() {
    setRefreshKey((current) => current + 1)
  }

  async function handleDeleteTransaction(tx: TransaksiResponse) {
    const label =
      tx.jenis_transaksi === "masuk"
        ? tx.nama_pemasok || "Barang Masuk"
        : tx.catatan || "Pakai Masak"

    if (
      !window.confirm(
        `Batalkan catatan "${label}" (${formatDate(tx.waktu_transaksi)})? Stok bahan akan dikembalikan seperti semula.`,
      )
    ) {
      return
    }

    setIsDeleting(true)
    setDeleteError("")

    try {
      await deleteTransaksi(tx.id_transaksi)
      setSelectedTransaction(null)
      handleRefresh()
    } catch (error: unknown) {
      setDeleteError(getErrorMessage(error))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-extrabold tracking-tight">
          Riwayat Catatan
        </h1>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading}
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          <span>Segarkan</span>
        </Button>
      </div>

      {pageError && (
        <div
          className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-base font-medium text-destructive"
          role="alert"
        >
          {pageError}
        </div>
      )}

      <div className="relative w-full sm:max-w-sm">
        <Search
          className="absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />

        <Input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setPage(1)
          }}
          placeholder="Cari catatan atau toko..."
          className="pl-11"
        />
      </div>

      {/* Tampilan Kartu untuk HP (Ketuk kartu langsung buka rincian) */}
      <div className="grid gap-3 md:hidden">
        {isLoading ? (
          <Card>
            <CardContent className="py-10 text-center text-base text-muted-foreground">
              Memuat...
            </CardContent>
          </Card>
        ) : transactions.length > 0 ? (
          transactions.map((transaction) => {
            const isMasuk = transaction.jenis_transaksi === "masuk"

            return (
              <button
                key={transaction.id_transaksi}
                type="button"
                onClick={() => {
                  setDeleteError("")
                  setSelectedTransaction(transaction)
                }}
                className="w-full cursor-pointer space-y-2 rounded-3xl border bg-card p-4 text-left shadow-xs transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center justify-between gap-2">
                  <Badge
                    variant="outline"
                    className={
                      isMasuk
                        ? "border-emerald-400 bg-emerald-50 text-emerald-900"
                        : "border-amber-400 bg-amber-50 text-amber-950"
                    }
                  >
                    {isMasuk ? "+ Beli" : "- Pakai"}
                  </Badge>

                  <span className="text-xs font-medium text-muted-foreground">
                    {formatDate(transaction.waktu_transaksi)}
                  </span>
                </div>

                <div>
                  <p className="text-base font-extrabold">
                    {isMasuk
                      ? transaction.nama_pemasok || "Barang Masuk"
                      : transaction.catatan || "Pakai Masak"}
                  </p>

                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {transaction.detail
                      .map(
                        (d) =>
                          `${d.nama_bahan} (${formatQuantity(d.jumlah)} ${d.satuan})`,
                      )
                      .join(", ")}
                  </p>
                </div>

                {isMasuk && (
                  <p className="pt-1 text-base font-black text-emerald-800 tabular-nums">
                    {formatCurrency(transaction.total_pembelian)}
                  </p>
                )}
              </button>
            )
          })
        ) : (
          <Card>
            <CardContent className="py-10 text-center text-base text-muted-foreground">
              Belum ada catatan.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tampilan Tabel untuk Laptop */}
      <Card className="hidden md:block">
        <CardContent className="pt-6">
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead>Toko / Keterangan</TableHead>
                  <TableHead>Bahan</TableHead>
                  <TableHead>Total Belanja</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Memuat...
                    </TableCell>
                  </TableRow>
                ) : transactions.length > 0 ? (
                  transactions.map((transaction) => (
                    <TableRow
                      key={transaction.id_transaksi}
                      onClick={() => {
                        setDeleteError("")
                        setSelectedTransaction(transaction)
                      }}
                      className="cursor-pointer"
                    >
                      <TableCell className="whitespace-nowrap font-medium">
                        {formatDate(transaction.waktu_transaksi)}
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            transaction.jenis_transaksi === "masuk"
                              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                              : "border-amber-300 bg-amber-50 text-amber-900"
                          }
                        >
                          {transaction.jenis_transaksi === "masuk"
                            ? "+ Beli"
                            : "- Pakai"}
                        </Badge>
                      </TableCell>

                      <TableCell className="font-bold">
                        {transaction.nama_pemasok ||
                          transaction.catatan ||
                          "-"}
                      </TableCell>

                      <TableCell>
                        {transaction.detail
                          .map(
                            (d) =>
                              `${d.nama_bahan} (${formatQuantity(d.jumlah)} ${d.satuan})`,
                          )
                          .join(", ")}
                      </TableCell>

                      <TableCell className="whitespace-nowrap font-bold tabular-nums">
                        {transaction.jenis_transaksi === "masuk"
                          ? formatCurrency(transaction.total_pembelian)
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Belum ada catatan.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Navigasi Halaman (Pagination) jika riwayat sudah lebih dari 25 catatan */}
      {pagination.total_pages > 1 && (
        <div className="flex items-center justify-between gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1 || isLoading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            <span>Sebelumnya</span>
          </Button>

          <span className="text-xs font-bold text-stone-600">
            Hal. {pagination.page} / {pagination.total_pages} (
            {pagination.total_items} catatan)
          </span>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= pagination.total_pages || isLoading}
            onClick={() =>
              setPage((p) => Math.min(pagination.total_pages, p + 1))
            }
          >
            <span>Berikutnya</span>
            <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
      )}

      <Dialog
        open={selectedTransaction !== null}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setSelectedTransaction(null)
        }}
      >
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold">
              Rincian Catatan
            </DialogTitle>
            <DialogDescription className="text-sm">
              {selectedTransaction
                ? formatDate(selectedTransaction.waktu_transaksi)
                : ""}
            </DialogDescription>
          </DialogHeader>

          {selectedTransaction && (
            <div className="space-y-4">
              {selectedTransaction.nama_pemasok && (
                <div className="rounded-xl bg-muted/60 p-3 text-sm">
                  Toko:{" "}
                  <span className="font-bold">
                    {selectedTransaction.nama_pemasok}
                  </span>
                </div>
              )}

              <div className="space-y-2">
                {selectedTransaction.detail.map((detail) => (
                  <div
                    key={detail.id_bahan}
                    className="flex items-center justify-between gap-3 rounded-xl border p-3"
                  >
                    <div>
                      <p className="text-base font-bold">{detail.nama_bahan}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatQuantity(detail.jumlah)} {detail.satuan}
                        {selectedTransaction.jenis_transaksi === "masuk" &&
                          detail.harga_beli_satuan !== null && (
                            <> × {formatCurrency(detail.harga_beli_satuan)}</>
                          )}
                      </p>
                    </div>

                    {selectedTransaction.jenis_transaksi === "masuk" && (
                      <p className="text-base font-bold tabular-nums">
                        {formatCurrency(detail.subtotal)}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {selectedTransaction.jenis_transaksi === "masuk" && (
                <div className="flex justify-between border-t pt-3 text-base font-extrabold">
                  <span>Total</span>
                  <span className="tabular-nums">
                    {formatCurrency(selectedTransaction.total_pembelian)}
                  </span>
                </div>
              )}

              {selectedTransaction.catatan && (
                <p className="text-sm text-muted-foreground">
                  Keterangan: {selectedTransaction.catatan}
                </p>
              )}

              {deleteError && (
                <p
                  className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-bold text-red-700"
                  role="alert"
                >
                  {deleteError}
                </p>
              )}

              <DialogFooter className="border-t pt-3">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={isDeleting}
                  onClick={() =>
                    void handleDeleteTransaction(selectedTransaction)
                  }
                  className="w-full font-bold sm:w-auto"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                  <span>
                    {isDeleting
                      ? "Membatalkan..."
                      : "Batalkan / Hapus Catatan Ini"}
                  </span>
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
