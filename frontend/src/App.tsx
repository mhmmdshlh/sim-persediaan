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
import { LaporanPage } from "@/pages/laporan";

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

          <Route path="laporan" element={<LaporanPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
