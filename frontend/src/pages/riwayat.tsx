import { useState } from "react";
import { Eye, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  getTransactions,
  type TransaksiRecord,
} from "@/services/transaksi-storage";

function formatDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function RiwayatPage() {
  const [transactions, setTransactions] = useState<TransaksiRecord[]>(() =>
    getTransactions(),
  );

  const [search, setSearch] = useState("");
  const [selectedTransaction, setSelectedTransaction] =
    useState<TransaksiRecord | null>(null);

  const filteredTransactions = transactions.filter((transaction) => {
    const query = search.toLowerCase();

    return (
      transaction.id_transaksi.toLowerCase().includes(query) ||
      transaction.waktu_transaksi.includes(query) ||
      transaction.catatan.toLowerCase().includes(query)
    );
  });

  function handleRefresh() {
    setTransactions(getTransactions());
  }

  const totalPembelian =
    selectedTransaction?.detail.reduce(
      (total, detail) =>
        total + (detail.harga_beli_satuan ?? 0) * detail.jumlah,
      0,
    ) ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Riwayat Transaksi</h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Lihat catatan barang masuk dan keluar.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari transaksi..."
                className="pl-9"
              />
            </div>

            <Button variant="outline" onClick={handleRefresh}>
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
                  <TableHead>Jumlah Bahan</TableHead>
                  <TableHead>Catatan</TableHead>
                  <TableHead className="text-right">Detail</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map((transaction) => (
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
                        {transaction.detail.length} jenis bahan
                      </TableCell>

                      <TableCell className="max-w-48 truncate">
                        {transaction.catatan || "-"}
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
                      colSpan={6}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Belum ada transaksi ditemukan.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <p className="text-xs text-muted-foreground">
            Menampilkan {filteredTransactions.length} dari {transactions.length}{" "}
            transaksi.
          </p>
        </CardContent>
      </Card>

      <Dialog
        open={selectedTransaction !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedTransaction(null);
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
                <div>
                  <p className="text-muted-foreground">ID Transaksi</p>
                  <p className="font-medium">
                    {selectedTransaction.id_transaksi.slice(0, 8)}
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

                {selectedTransaction.id_pemasok !== null && (
                  <div>
                    <p className="text-muted-foreground">ID Pemasok</p>
                    <p className="font-medium">
                      {selectedTransaction.id_pemasok}
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
                          <TableHead>Harga</TableHead>
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

                          <TableCell>
                            {detail.jumlah} {detail.satuan}
                          </TableCell>

                          {selectedTransaction.jenis_transaksi === "masuk" && (
                            <TableCell>
                              {formatCurrency(detail.harga_beli_satuan ?? 0)}
                            </TableCell>
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
                  <span>{formatCurrency(totalPembelian)}</span>
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
  );
}
