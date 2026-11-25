import { useState, type SubmitEvent } from "react"
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

export interface SimpleMasterItem {
  id: number;
  name: string;
}

interface SimpleMasterPageProps {
  title: string;
  description: string;
  itemLabel: string;
  initialItems: SimpleMasterItem[];
}

export function SimpleMasterPage({
  title,
  description,
  itemLabel,
  initialItems,
}: SimpleMasterPageProps) {
  const [items, setItems] = useState<SimpleMasterItem[]>(initialItems);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()),
  );

  function openCreateDialog() {
    setEditingId(null);
    setName("");
    setError("");
    setDialogOpen(true);
  }

  function openEditDialog(item: SimpleMasterItem) {
    setEditingId(item.id);
    setName(item.name);
    setError("");
    setDialogOpen(true);
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError(`Nama ${itemLabel.toLowerCase()} wajib diisi.`);
      return;
    }

    const duplicate = items.some(
      (item) =>
        item.id !== editingId &&
        item.name.toLowerCase() === trimmedName.toLowerCase(),
    );

    if (duplicate) {
      setError(`${itemLabel} tersebut sudah terdaftar.`);
      return;
    }

    if (editingId !== null) {
      setItems((current) =>
        current.map((item) =>
          item.id === editingId ? { ...item, name: trimmedName } : item,
        ),
      );
    } else {
      setItems((current) => {
        const nextId =
          current.reduce((maximum, item) => Math.max(maximum, item.id), 0) + 1;

        return [...current, { id: nextId, name: trimmedName }];
      });
    }

    setDialogOpen(false);
  }

  function handleDelete(item: SimpleMasterItem) {
    const confirmed = window.confirm(
      `Hapus ${itemLabel.toLowerCase()} "${item.name}"?`,
    );

    if (!confirmed) return;

    setItems((current) =>
      current.filter((currentItem) => currentItem.id !== item.id),
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

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
                {filteredItems.length > 0 ? (
                  filteredItems.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Edit ${item.name}`}
                            onClick={() => openEditDialog(item)}
                          >
                            <Pencil className="size-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Hapus ${item.name}`}
                            onClick={() => handleDelete(item)}
                          >
                            <Trash2 className="size-4" />
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
                  setError("");
                }}
                placeholder={`Masukkan nama ${itemLabel.toLowerCase()}`}
                required
              />

              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Batal
              </Button>

              <Button type="submit">Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
