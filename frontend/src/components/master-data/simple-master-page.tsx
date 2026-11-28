import { useEffect, useState, type SubmitEvent } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { MasterDataItem } from "@/types/master-data";

interface SimpleMasterPageProps {
  title: string;
  description: string;
  itemLabel: string;
  loadItems: () => Promise<MasterDataItem[]>;
  createItem: (name: string) => Promise<MasterDataItem>;
  updateItem: (id: number, name: string) => Promise<MasterDataItem>;
  deleteItem: (id: number) => Promise<void>;
}

export function SimpleMasterPage({
  title,
  description,
  itemLabel,
  loadItems,
  createItem,
  updateItem,
  deleteItem,
}: SimpleMasterPageProps) {
  const [items, setItems] = useState<MasterDataItem[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pageError, setPageError] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    let isActive = true;

    void loadItems()
      .then((data) => {
        if (isActive) setItems(data);
      })
      .catch((error: unknown) => {
        if (isActive) {
          setPageError(
            error instanceof Error ? error.message : "Gagal mengambil data.",
          );
        }
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [loadItems]);

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()),
  );

  function openCreateDialog() {
    setEditingId(null);
    setName("");
    setFormError("");
    setDialogOpen(true);
  }

  function openEditDialog(item: MasterDataItem) {
    setEditingId(item.id);
    setName(item.name);
    setFormError("");
    setDialogOpen(true);
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();

    if (!trimmedName) {
      setFormError(`Nama ${itemLabel.toLowerCase()} wajib diisi.`);
      return;
    }

    const duplicate = items.some(
      (item) =>
        item.id !== editingId &&
        item.name.toLowerCase() === trimmedName.toLowerCase(),
    );

    if (duplicate) {
      setFormError(`${itemLabel} tersebut sudah terdaftar.`);
      return;
    }

    setIsSaving(true);
    setFormError("");
    setPageError("");

    try {
      if (editingId !== null) {
        const updated = await updateItem(editingId, trimmedName);

        setItems((current) =>
          current.map((item) => (item.id === editingId ? updated : item)),
        );
      } else {
        const created = await createItem(trimmedName);

        setItems((current) => [...current, created]);
      }

      setDialogOpen(false);
      setName("");
      setEditingId(null);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : `Gagal menyimpan ${itemLabel.toLowerCase()}.`,
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(item: MasterDataItem) {
    const confirmed = window.confirm(
      `Hapus ${itemLabel.toLowerCase()} "${item.name}"?`,
    );

    if (!confirmed) return;

    setPageError("");

    try {
      await deleteItem(item.id);

      setItems((current) =>
        current.filter((currentItem) => currentItem.id !== item.id),
      );
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : `Gagal menghapus ${itemLabel.toLowerCase()}.`,
      );
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      {pageError && (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
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
                placeholder={`Cari ${itemLabel.toLowerCase()}...`}
                className="pl-9"
              />
            </div>

            <Button onClick={openCreateDialog}>
              <Plus className="size-4" />
              Tambah {itemLabel}
            </Button>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">No.</TableHead>
                  <TableHead>Nama {itemLabel}</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Memuat data...
                    </TableCell>
                  </TableRow>
                ) : filteredItems.length > 0 ? (
                  filteredItems.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="text-base font-bold">{item.name}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            aria-label={`Ubah ${item.name}`}
                            onClick={() => openEditDialog(item)}
                          >
                            <Pencil className="size-4" />
                            Ubah
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`Hapus ${item.name}`}
                            onClick={() => void handleDelete(item)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="size-4" />
                            Hapus
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Tidak ada data ditemukan.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <p className="text-xs text-muted-foreground">
            Menampilkan {filteredItems.length} dari {items.length} data.
          </p>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId !== null ? `Edit ${itemLabel}` : `Tambah ${itemLabel}`}
            </DialogTitle>
            <DialogDescription>
              Masukkan nama {itemLabel.toLowerCase()}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="master-name" className="text-sm font-medium">
                Nama {itemLabel}
              </label>

              <Input
                id="master-name"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setFormError("");
                }}
                placeholder={`Masukkan nama ${itemLabel.toLowerCase()}`}
                required
                disabled={isSaving}
              />

              {formError && (
                <p className="text-sm text-destructive" role="alert">
                  {formError}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={isSaving}
                onClick={() => setDialogOpen(false)}
              >
                Batal
              </Button>

              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
