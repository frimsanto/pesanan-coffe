"use client";

import * as React from "react";
import { Plus, Pencil, Trash2, UtensilsCrossed, ImagePlus, X } from "lucide-react";

import { formatRupiah } from "@/lib/utils";
import type { CategoryRow, MenuRow } from "@/lib/db-types";
import { createClient } from "@/lib/supabase/client";
import { MenuThumb } from "@/components/menu-thumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createMenu, updateMenu, deleteMenu, type MenuInput } from "./actions";

export function MenuManager({
  categories,
  menu,
}: {
  categories: CategoryRow[];
  menu: MenuRow[];
}) {
  const [editing, setEditing] = React.useState<MenuRow | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  function handleDelete(id: string) {
    if (!confirm("Hapus menu ini?")) return;
    startTransition(async () => {
      await deleteMenu(id);
    });
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Menu &amp; Kategori</h1>
          <p className="text-sm text-muted-foreground">
            Kelola item, harga, dan ketersediaan
          </p>
        </div>
        <Button onClick={() => setCreating(true)} disabled={categories.length === 0}>
          <Plus className="h-4 w-4" /> Tambah Menu
        </Button>
      </div>

      {/* Kategori */}
      <div className="mb-4 flex flex-wrap gap-2">
        {categories.map((k) => (
          <Badge key={k.id} variant="outline" className="px-3 py-1 text-sm">
            {k.nama}
          </Badge>
        ))}
      </div>

      {menu.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead className="text-right">Harga</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {menu.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <MenuThumb
                        fotoUrl={item.foto_url}
                        jenis={item.jenis}
                        nama={item.nama}
                        className="h-10 w-10 shrink-0 rounded-md"
                      />
                      {item.nama}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.kategori}
                  </TableCell>
                  <TableCell className="tabular text-right">
                    {formatRupiah(item.harga)}
                  </TableCell>
                  <TableCell>
                    {item.is_available ? (
                      <Badge variant="success">Tersedia</Badge>
                    ) : (
                      <Badge variant="destructive">Habis</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9"
                        onClick={() => setEditing(item)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 text-destructive hover:text-destructive"
                        disabled={pending}
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {(creating || editing) && (
        <MenuFormDialog
          categories={categories}
          item={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function MenuFormDialog({
  categories,
  item,
  onClose,
}: {
  categories: CategoryRow[];
  item: MenuRow | null;
  onClose: () => void;
}) {
  const [nama, setNama] = React.useState(item?.nama ?? "");
  const [harga, setHarga] = React.useState(String(item?.harga ?? ""));
  const [categoryId, setCategoryId] = React.useState(
    item?.category_id ?? categories[0]?.id ?? ""
  );
  const [available, setAvailable] = React.useState(item?.is_available ?? true);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  // Foto: URL yang tersimpan (untuk edit) + file baru + preview lokal.
  const [fotoUrl, setFotoUrl] = React.useState<string | null>(item?.foto_url ?? null);
  const [file, setFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const jenis =
    categories.find((c) => c.id === categoryId)?.jenis ?? "makanan";
  const shownFoto = previewUrl ?? fotoUrl;

  React.useEffect(() => {
    // Bersihkan object URL preview saat berganti/menutup.
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function pickFile(f: File | null) {
    setError(null);
    if (!f) return;
    if (!["image/jpeg", "image/png"].includes(f.type)) {
      setError("Format foto harus JPG atau PNG.");
      return;
    }
    if (f.size > 2 * 1024 * 1024) {
      setError("Ukuran foto maksimal 2MB.");
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  }

  function removeFoto() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setFotoUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function uploadFoto(): Promise<string | null> {
    if (!file) return fotoUrl; // tidak ganti foto -> pakai yang lama
    const supabase = createClient();
    const ext = file.type === "image/png" ? "png" : "jpg";
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("menu-photos")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (upErr) throw new Error(upErr.message);
    const { data } = supabase.storage.from("menu-photos").getPublicUrl(path);
    return data.publicUrl;
  }

  function submit() {
    const namaTrim = nama.trim();
    if (!namaTrim || !categoryId) {
      setError("Nama dan kategori wajib diisi.");
      return;
    }
    startTransition(async () => {
      let finalFotoUrl: string | null;
      try {
        setUploading(true);
        finalFotoUrl = await uploadFoto();
      } catch (e) {
        setUploading(false);
        setError(e instanceof Error ? e.message : "Gagal mengunggah foto.");
        return;
      }
      setUploading(false);
      const input: MenuInput = {
        nama: namaTrim,
        harga: Number(harga) || 0,
        category_id: categoryId,
        is_available: available,
        foto_url: finalFotoUrl,
      };
      const res = item ? await updateMenu(item.id, input) : await createMenu(input);
      if (res.ok) onClose();
      else setError(res.message ?? "Gagal menyimpan.");
    });
  }

  const busy = pending || uploading;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? "Edit Menu" : "Tambah Menu"}</DialogTitle>
          <DialogDescription>Isi detail item menu.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          {/* Foto */}
          <div className="grid gap-1.5">
            <label className="text-sm font-medium">Foto</label>
            <div className="flex items-center gap-3">
              <div className="relative">
                <MenuThumb
                  fotoUrl={shownFoto}
                  jenis={jenis}
                  nama={nama || "menu"}
                  className="h-20 w-20 shrink-0 rounded-lg border border-border"
                />
                {shownFoto && (
                  <button
                    type="button"
                    onClick={removeFoto}
                    className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:text-destructive"
                    aria-label="Hapus foto"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="grid gap-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  className="hidden"
                  onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImagePlus className="h-4 w-4" /> Pilih foto
                </Button>
                <p className="text-xs text-muted-foreground">
                  JPG/PNG, maks 2MB. Kosongkan untuk ikon otomatis.
                </p>
              </div>
            </div>
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm font-medium">Nama</label>
            <Input
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="mis. Caffe Latte"
            />
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm font-medium">Harga</label>
            <Input
              type="number"
              value={harga}
              onChange={(e) => setHarga(e.target.value)}
              placeholder="30000"
            />
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm font-medium">Kategori</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="h-11 rounded-md border border-input bg-background px-3 text-sm"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nama}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={available}
              onChange={(e) => setAvailable(e.target.checked)}
              className="h-4 w-4"
            />
            Tersedia untuk dijual
          </label>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Batal
          </Button>
          <Button onClick={submit} disabled={busy}>
            {uploading ? "Mengunggah…" : pending ? "Menyimpan…" : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <UtensilsCrossed className="h-8 w-8" />
      </div>
      <div>
        <p className="text-lg font-semibold">Belum ada menu</p>
        <p className="text-sm text-muted-foreground">
          Tambahkan item pertama Anda dengan tombol “Tambah Menu”.
        </p>
      </div>
    </div>
  );
}
