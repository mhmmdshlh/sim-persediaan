import { useEffect, useState, type SubmitEvent } from "react";
import { Pencil, Plus, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  createBahan,
  deactivateBahan,
  getBahanList,
  updateBahan,
} from "@/services/bahan-service";
import { getKategoriList } from "@/services/kategori-service";
import { getSatuanList } from "@/services/satuan-service";

import type {
  Bahan,
  BahanFormValues,
  BahanPayload,
  StatusStok,
} from "@/types/bahan";

import type { MasterDataItem } from "@/types/master-data";

const EMPTY_FORM: BahanFormValues = {
  nama_bahan: "",
  id_kategori: "",
  id_satuan: "",
  stok_minimum: "",
};

const STOCK_STATUS_LABEL: Record<StatusStok, string> = {
  habis: "HABIS",
  menipis: "MENIPIS",
  aman: "AMAN",
};

function getStockStatusClass(status: StatusStok): string {
  switch (status) {
    case "habis":
      return "border-red-400 bg-red-100 text-red-800";
    case "menipis":
      return "border-amber-400 bg-amber-100 text-amber-900";
    case "aman":
      return "border-emerald-400 bg-emerald-100 text-emerald-800";
  }
}

function getCardBorderClass(status: StatusStok): string {
  switch (status) {
    case "habis":
      return "border-2 border-red-300 bg-red-50/40";
    case "menipis":
      return "border-2 border-amber-300 bg-amber-50/40";
    case "aman":
      return "border";
  }
}

export function BahanPage() {
  const [bahanList, setBahanList] = useState<Bahan[]>([]);
  const [kategoriList, setKategoriList] = useState<MasterDataItem[]>([]);
  const [satuanList, setSatuanList] = useState<MasterDataItem[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [form, setForm] = useState<BahanFormValues>({ ...EMPTY_FORM });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pageError, setPageError] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    let isActive = true;

    void Promise.all([getBahanList(), getKategoriList(), getSatuanList()])
      .then(([bahan, kategori, satuan]) => {
        if (!isActive) return;

        setBahanList(bahan);
        setKategoriList(kategori);
        setSatuanList(satuan);
      })
      .catch((error: unknown) => {
        if (!isActive) return;

        setPageError(
          error instanceof Error
            ? error.message
            : "Gagal mengambil data bahan.",
        );
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  const filteredBahan = bahanList.filter((bahan) =>
    bahan.nama_bahan.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const kategoriItems = kategoriList.map((kategori) => ({
    label: kategori.name,
    value: String(kategori.id),
  }));

  const satuanItems = satuanList.map((satuan) => ({
    label: satuan.name,
    value: String(satuan.id),
  }));

  function openCreateDialog() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setFormError("");
    setDialogOpen(true);
  }

  function openEditDialog(bahan: Bahan) {
    setEditingId(bahan.id_bahan);

    setForm({
      nama_bahan: bahan.nama_bahan,
      id_kategori: String(bahan.id_kategori),
      id_satuan: String(bahan.id_satuan),
      stok_minimum: String(bahan.stok_minimum),
    });

    setFormError("");
    setDialogOpen(true);
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const namaBahan = form.nama_bahan.trim();
    const stokMinimum = Number(form.stok_minimum);
    const idKategori = Number(form.id_kategori);
    const idSatuan = Number(form.id_satuan);

    if (
      !namaBahan ||
      !form.id_kategori ||
      !form.id_satuan ||
      !form.stok_minimum.trim() ||
      !Number.isSafeInteger(idKategori) ||
      !Number.isSafeInteger(idSatuan) ||
      !Number.isFinite(stokMinimum) ||
      stokMinimum < 0
    ) {
      setFormError("Periksa kembali seluruh isian yang wajib diisi.");
      return;
    }

    const payload: BahanPayload = {
      nama_bahan: namaBahan,
      id_kategori: idKategori,
      id_satuan: idSatuan,
      stok_minimum: stokMinimum,
    };

    setIsSaving(true);

    try {
      if (editingId !== null) {
        const updated = await updateBahan(editingId, payload);

        setBahanList((current) =>
          current.map((item) => (item.id_bahan === editingId ? updated : item)),
        );
      } else {
        const created = await createBahan(payload);

        setBahanList((current) =>
          [...current, created].sort((a, b) => a.id_bahan - b.id_bahan),
        );
      }

      setDialogOpen(false);
      setEditingId(null);
      setForm({ ...EMPTY_FORM });
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Gagal menyimpan data bahan.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleActive(bahan: Bahan) {
    if (
      bahan.aktif &&
      !window.confirm(`Nonaktifkan bahan "${bahan.nama_bahan}"?`)
    ) {
      return;
    }

    setPageError("");

    try {
      const updated = bahan.aktif
        ? await deactivateBahan(bahan.id_bahan)
        : await updateBahan(bahan.id_bahan, { aktif: true });

      setBahanList((current) =>
        current.map((item) =>
          item.id_bahan === updated.id_bahan ? updated : item,
        ),
      );
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : "Gagal mengubah status bahan.",
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stok Bahan</h1>
          <p className="mt-1 text-base text-muted-foreground">
            Lihat sisa stok bahan baku dan kemasan saat ini.
          </p>
        </div>

        <Button size="lg" onClick={openCreateDialog}>
          <Plus className="size-5" />
          Tambah Bahan Baru
        </Button>
      </div>

      {pageError && (
        <div
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-3.5 text-base font-medium text-destructive"
          role="alert"
        >
          {pageError}
        </div>
      )}

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />

            <Input
              placeholder="Cari nama bahan (misal: Ayam, Cabai)..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="pl-11"
            />
          </div>

          {/* Tampilan Kartu untuk HP (tanpa geser tabel ke samping) */}
          <div className="grid gap-3 md:hidden">
            {isLoading ? (
              <p className="py-10 text-center text-base text-muted-foreground">
                Memuat daftar bahan...
              </p>
            ) : filteredBahan.length > 0 ? (
              filteredBahan.map((bahan) => (
                <div
                  key={bahan.id_bahan}
                  className={`space-y-3 rounded-2xl p-4 ${getCardBorderClass(bahan.status)} ${!bahan.aktif ? "opacity-60" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-lg font-bold">{bahan.nama_bahan}</p>
                      <p className="text-sm text-muted-foreground">
                        {bahan.nama_kategori}
                        {!bahan.aktif && " • (Tidak dipakai)"}
                      </p>
                    </div>

                    <Badge
                      variant="outline"
                      className={getStockStatusClass(bahan.status)}
                    >
                      {STOCK_STATUS_LABEL[bahan.status]}
                    </Badge>
                  </div>

                  <div className="flex items-baseline justify-between rounded-xl bg-muted/60 px-3.5 py-2.5">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Sisa Stok Sekarang
                      </p>
                      <p className="text-2xl font-extrabold">
                        {bahan.stok_saat_ini} {bahan.nama_satuan}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        Batas Minimum
                      </p>
                      <p className="text-base font-semibold">
                        {bahan.stok_minimum} {bahan.nama_satuan}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(bahan)}
                    >
                      <Pencil className="size-4" />
                      Ubah
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void handleToggleActive(bahan)}
                    >
                      {bahan.aktif ? "Nonaktifkan" : "Aktifkan"}
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="py-10 text-center text-base text-muted-foreground">
                Tidak ada bahan ditemukan.
              </p>
            )}
          </div>

          {/* Tampilan Tabel untuk Layar Lebar / Laptop */}
          <div className="hidden overflow-x-auto rounded-xl border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Bahan</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Sisa Stok</TableHead>
                  <TableHead>Batas Minimum</TableHead>
                  <TableHead>Kondisi Stok</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Memuat data bahan...
                    </TableCell>
                  </TableRow>
                ) : filteredBahan.length > 0 ? (
                  filteredBahan.map((bahan) => (
                    <TableRow key={bahan.id_bahan}>
                      <TableCell className="text-base font-bold">
                        {bahan.nama_bahan}
                      </TableCell>

                      <TableCell>{bahan.nama_kategori}</TableCell>

                      <TableCell className="text-base font-bold">
                        {bahan.stok_saat_ini} {bahan.nama_satuan}
                      </TableCell>

                      <TableCell>
                        {bahan.stok_minimum} {bahan.nama_satuan}
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getStockStatusClass(bahan.status)}
                        >
                          {STOCK_STATUS_LABEL[bahan.status]}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <Badge variant={bahan.aktif ? "default" : "secondary"}>
                          {bahan.aktif ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            aria-label={`Ubah ${bahan.nama_bahan}`}
                            onClick={() => openEditDialog(bahan)}
                          >
                            <Pencil className="size-4" />
                            Ubah
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => void handleToggleActive(bahan)}
                          >
                            {bahan.aktif ? "Nonaktifkan" : "Aktifkan"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Tidak ada bahan ditemukan.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <p className="text-sm text-muted-foreground">
            Menampilkan {filteredBahan.length} dari {bahanList.length} bahan.
          </p>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingId !== null ? "Ubah Bahan" : "Tambah Bahan Baru"}
            </DialogTitle>

            <DialogDescription className="text-sm">
              Isi nama bahan, satuan takaran, dan batas stok minimum untuk peringatan belanja.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="nama_bahan" className="text-base font-medium">
                Nama Bahan
              </label>

              <Input
                id="nama_bahan"
                value={form.nama_bahan}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    nama_bahan: event.target.value,
                  }))
                }
                placeholder="Contoh: Ayam Potong"
                required
                disabled={isSaving}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="kategori" className="text-base font-medium">
                Kategori
              </label>

              <Select
                value={form.id_kategori}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    id_kategori: value ?? "",
                  }))
                }
                items={kategoriItems}
              >
                <SelectTrigger id="kategori" className="w-full">
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>

                <SelectContent>
                  {kategoriItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="satuan" className="text-base font-medium">
                Satuan Takaran
              </label>

              <Select
                value={form.id_satuan}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    id_satuan: value ?? "",
                  }))
                }
                items={satuanItems}
              >
                <SelectTrigger id="satuan" className="w-full">
                  <SelectValue placeholder="Pilih satuan (kg, liter, butir...)" />
                </SelectTrigger>

                <SelectContent>
                  {satuanItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="stok_minimum" className="text-base font-medium">
                Batas Minimum (Peringatan Menipis)
              </label>

              <Input
                id="stok_minimum"
                type="number"
                min="0"
                step="any"
                value={form.stok_minimum}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    stok_minimum: event.target.value,
                  }))
                }
                placeholder="Contoh: 5"
                required
                disabled={isSaving}
              />
            </div>

            {formError && (
              <p className="text-base font-medium text-destructive" role="alert">
                {formError}
              </p>
            )}

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={isSaving}
              >
                Batal
              </Button>

              <Button type="submit" disabled={isSaving}>
                {isSaving
                  ? "Menyimpan..."
                  : editingId !== null
                    ? "Simpan Perubahan"
                    : "Simpan Bahan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
