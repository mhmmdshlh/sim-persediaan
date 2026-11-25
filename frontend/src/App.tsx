import { BrowserRouter, Route, Routes } from "react-router-dom";

import { AppLayout } from "@/components/layout/app-layout";
import { DashboardPage } from "@/pages/dashboard";
import { BahanPage } from "@/pages/bahan";

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div>
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Halaman ini sedang dalam tahap pengembangan.
      </p>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />

          <Route path="bahan" element={<BahanPage />} />

          <Route
            path="kategori"
            element={<PlaceholderPage title="Kategori Bahan" />}
          />

          <Route path="satuan" element={<PlaceholderPage title="Satuan" />} />

          <Route
            path="pemasok"
            element={<PlaceholderPage title="Data Pemasok" />}
          />

          <Route
            path="transaksi/masuk"
            element={<PlaceholderPage title="Barang Masuk" />}
          />

          <Route
            path="transaksi/keluar"
            element={<PlaceholderPage title="Barang Keluar" />}
          />

          <Route
            path="riwayat"
            element={<PlaceholderPage title="Riwayat Transaksi" />}
          />

          <Route
            path="laporan"
            element={<PlaceholderPage title="Laporan Persediaan" />}
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
