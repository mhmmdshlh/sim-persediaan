import { BrowserRouter, Route, Routes } from "react-router-dom";

import { AppLayout } from "@/components/layout/app-layout";
import { DashboardPage } from "@/pages/dashboard";
import { BahanPage } from "@/pages/bahan";
import { KategoriPage } from "@/pages/kategori";
import { SatuanPage } from "@/pages/satuan";
import { PemasokPage } from "@/pages/pemasok";
import { TransaksiMasukPage } from "@/pages/transaksi-masuk";
import { TransaksiKeluarPage } from "@/pages/transaksi-keluar";
import { RiwayatPage } from "@/pages/riwayat";

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

          <Route path="kategori" element={<KategoriPage />} />

          <Route path="satuan" element={<SatuanPage />} />

          <Route path="pemasok" element={<PemasokPage />} />

          <Route path="transaksi/masuk" element={<TransaksiMasukPage />} />

          <Route path="transaksi/keluar" element={<TransaksiKeluarPage />} />
          <Route path="riwayat" element={<RiwayatPage />} />

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
