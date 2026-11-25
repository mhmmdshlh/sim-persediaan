import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { getTransactions } from "@/services/transaksi-storage";

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

export function LaporanPage() {
  const [transactions] = useState(() => getTransactions());
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const filteredTransactions = transactions.filter((transaction) => {
    const date = transaction.waktu_transaksi;

    if (startDate && date < startDate) return false;
    if (endDate && date > endDate) return false;

    return true;
  });

  // Ringkasan pemakaian bahan
  const usageMap = new Map<
    number,
    {
      id_bahan: number;
      nama_bahan: string;
      satuan: string;
      total_jumlah: number;
      jumlah_transaksi: number;
    }
  >();

  for (const transaction of filteredTransactions) {
    if (transaction.jenis_transaksi !== "keluar") continue;

    for (const detail of transaction.detail) {
      const current = usageMap.get(detail.id_bahan);

      if (current) {
        current.total_jumlah += detail.jumlah;
        current.jumlah_transaksi += 1;
      } else {
        usageMap.set(detail.id_bahan, {
          id_bahan: detail.id_bahan,
          nama_bahan: detail.nama_bahan,
          satuan: detail.satuan,
          total_jumlah: detail.jumlah,
          jumlah_transaksi: 1,
        });
      }
    }
  }

  const usageRows = Array.from(usageMap.values()).sort(
    (a, b) => b.total_jumlah - a.total_jumlah,
  );

  // Riwayat harga pembelian
  const priceRows = filteredTransactions.flatMap((transaction) => {
    if (transaction.jenis_transaksi !== "masuk") return [];

    return transaction.detail.map((detail) => ({
      id: `${transaction.id_transaksi}-${detail.id_bahan}`,
      tanggal: transaction.waktu_transaksi,
      nama_bahan: detail.nama_bahan,
      jumlah: detail.jumlah,
      satuan: detail.satuan,
      harga: detail.harga_beli_satuan,
      subtotal: detail.jumlah * (detail.harga_beli_satuan ?? 0),
    }));
  });

  // Statistik transaksi
  const totalMasuk = filteredTransactions.filter(
    (transaction) => transaction.jenis_transaksi === "masuk",
  ).length;

  const totalKeluar = filteredTransactions.filter(
    (transaction) => transaction.jenis_transaksi === "keluar",
  ).length;

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Laporan Persediaan
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Analisis pemakaian, harga pembelian, dan nilai persediaan.
          </p>
        </div>

        <Badge variant="outline">Data lokal / contoh</Badge>
      </div>

      {/* Period Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filter Periode</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="tanggal-mulai" className="text-sm font-medium">
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
              <label htmlFor="tanggal-akhir" className="text-sm font-medium">
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

          <p className="mt-3 text-xs text-muted-foreground">
            Kosongkan kedua tanggal untuk menampilkan seluruh transaksi.
          </p>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Transaksi Masuk</p>
            <p className="mt-2 text-2xl font-bold">{totalMasuk}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Dalam periode terpilih
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Transaksi Keluar</p>
            <p className="mt-2 text-2xl font-bold">{totalKeluar}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Dalam periode terpilih
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Jenis Bahan Digunakan
            </p>
            <p className="mt-2 text-2xl font-bold">{usageRows.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Bahan berbeda dalam transaksi keluar
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Usage Report */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Laporan Pemakaian Bahan</CardTitle>

          <p className="text-sm text-muted-foreground">
            Total penggunaan setiap bahan berdasarkan transaksi keluar.
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
                </TableRow>
              </TableHeader>

              <TableBody>
                {usageRows.length > 0 ? (
                  usageRows.map((item) => (
                    <TableRow key={item.id_bahan}>
                      <TableCell className="font-medium">
                        {item.nama_bahan}
                      </TableCell>

                      <TableCell>
                        {item.total_jumlah} {item.satuan}
                      </TableCell>

                      <TableCell>{item.jumlah_transaksi}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Belum ada data pemakaian bahan.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Purchase Price History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Riwayat Harga Pembelian</CardTitle>

          <p className="text-sm text-muted-foreground">
            Perubahan harga beli bahan berdasarkan transaksi masuk.
          </p>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Nama Bahan</TableHead>
                  <TableHead>Jumlah</TableHead>
                  <TableHead>Harga Satuan</TableHead>
                  <TableHead>Subtotal</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {priceRows.length > 0 ? (
                  priceRows.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(item.tanggal)}
                      </TableCell>

                      <TableCell className="font-medium">
                        {item.nama_bahan}
                      </TableCell>

                      <TableCell>
                        {item.jumlah} {item.satuan}
                      </TableCell>

                      <TableCell>
                        {item.harga !== null ? formatCurrency(item.harga) : "-"}
                      </TableCell>

                      <TableCell className="font-medium">
                        {formatCurrency(item.subtotal)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Belum ada riwayat pembelian bahan.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Valuation */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Nilai Persediaan</CardTitle>

            <Badge variant="outline">Menunggu integrasi backend</Badge>
          </div>

          <p className="text-sm text-muted-foreground">
            Nilai moneter dari stok bahan yang masih tersedia.
          </p>
        </CardHeader>

        <CardContent>
          <div className="rounded-lg border border-dashed p-6 text-center">
            <p className="text-sm font-medium">
              Data nilai persediaan belum tersedia.
            </p>

            <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
              Perhitungan membutuhkan saldo stok yang valid dan metode penilaian
              persediaan yang disepakati dengan backend. Data transaksi lokal
              saat ini belum cukup untuk menentukan nilai persediaan secara
              akurat.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
