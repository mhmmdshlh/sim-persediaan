import {
  ArrowDownToLine,
  ArrowUpFromLine,
  AlertTriangle,
  Package,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
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

const summaryCards = [
  {
    title: "Jenis Bahan",
    value: "18",
    description: "Bahan terdaftar",
    icon: Package,
  },
  {
    title: "Stok Menipis",
    value: "3",
    description: "Perlu segera diperiksa",
    icon: AlertTriangle,
  },
  {
    title: "Barang Masuk",
    value: "4",
    description: "Transaksi hari ini",
    icon: ArrowDownToLine,
  },
  {
    title: "Barang Keluar",
    value: "7",
    description: "Transaksi hari ini",
    icon: ArrowUpFromLine,
  },
]

const lowStockItems = [
  { name: "Ayam", stock: "3 kg", minimum: "5 kg" },
  { name: "Telur", stock: "8 kg", minimum: "10 kg" },
  { name: "Cabai", stock: "1 kg", minimum: "2 kg" },
]

const recentTransactions = [
  {
    date: "25 Nov 2026",
    name: "Pembelian bahan baku",
    type: "Masuk",
    quantity: "5 jenis bahan",
  },
  {
    date: "25 Nov 2026",
    name: "Pemakaian produksi",
    type: "Keluar",
    quantity: "3 jenis bahan",
  },
  {
    date: "24 Nov 2026",
    name: "Pembelian kemasan",
    type: "Masuk",
    quantity: "2 jenis bahan",
  },
]

export function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page Heading */}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">
            Dashboard
          </h1>

          <Badge variant="outline">Data contoh</Badge>
        </div>

        <p className="mt-1 text-sm text-muted-foreground">
          Ringkasan kondisi persediaan bahan baku usaha.
        </p>
      </div>

      {/* Summary Cards */}
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

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Low Stock */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Persediaan Menipis
            </CardTitle>

            <p className="text-sm text-muted-foreground">
              Bahan yang berada di bawah batas minimum.
            </p>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
              {lowStockItems.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {item.name}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      Minimum: {item.minimum}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">
                      {item.stock}
                    </span>

                    <Badge
                      variant="outline"
                      className="border-amber-300 bg-amber-50 text-amber-700"
                    >
                      Menipis
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Transaksi Terbaru
            </CardTitle>

            <p className="text-sm text-muted-foreground">
              Riwayat pencatatan persediaan.
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
                  {recentTransactions.map((transaction, index) => (
                    <TableRow key={index}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {transaction.date}
                      </TableCell>

                      <TableCell>
                        <p className="text-sm font-medium">
                          {transaction.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {transaction.quantity}
                        </p>
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            transaction.type === "Masuk"
                              ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                              : "border-slate-300 bg-slate-50 text-slate-700"
                          }
                        >
                          {transaction.type}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}