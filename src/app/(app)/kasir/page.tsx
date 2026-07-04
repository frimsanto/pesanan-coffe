"use client";

import * as React from "react";
import {
  Minus,
  Plus,
  Trash2,
  Search,
  ShoppingCart,
  BellRing,
  Check,
  X,
  ArrowLeft,
  Store,
  ShoppingBag,
  CheckCircle2,
} from "lucide-react";

import { cn, formatRupiah } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { MenuRow, OrderRow } from "@/lib/db-types";
import { MenuThumb } from "@/components/menu-thumb";
import { PaymentMethodPicker } from "@/components/payment-method-picker";
import { METODE_LABEL, type PaymentChannel } from "@/lib/payment";
import { fetchPendingSelfOrders } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createKasirOrder, approveOrder, type CartItemInput } from "./actions";

type CartLine = { item: MenuRow; qty: number };
type OrderTipe = "dinein" | "takeaway";
type PayStep = "method" | "tunai";
type PayResult = {
  meja: string | null;
  nomorAntrian: number | null;
  items: { nama: string; qty: number; harga: number }[];
  total: number;
  metodeLabel: string;
  kembalian: number | null;
};

const PAJAK_PERSEN = 10;

export default function KasirPage() {
  const supabase = React.useMemo(() => createClient(), []);

  const [menu, setMenu] = React.useState<MenuRow[]>([]);
  const [kategoriList, setKategoriList] = React.useState<string[]>([]);
  const [tables, setTables] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [kategori, setKategori] = React.useState<string>("Semua");
  const [query, setQuery] = React.useState("");
  const [cart, setCart] = React.useState<CartLine[]>([]);
  const [meja, setMeja] = React.useState<string>("");
  const [pending, setPending] = React.useState<OrderRow[]>([]);
  const [saving, startSaving] = React.useTransition();

  // Tipe pesanan + alur pembayaran (modal).
  const [tipe, setTipe] = React.useState<OrderTipe>("dinein");
  const [payOpen, setPayOpen] = React.useState(false);
  const [payStep, setPayStep] = React.useState<PayStep>("method");
  const [channel, setChannel] = React.useState<PaymentChannel | null>(null);
  const [uang, setUang] = React.useState("");
  const [result, setResult] = React.useState<PayResult | null>(null);

  // Muat data awal.
  React.useEffect(() => {
    let active = true;
    (async () => {
      const [menuRes, catRes, tableRes, pendingRes] = await Promise.all([
        supabase
          .from("menu_items")
          .select(
            "id, nama, harga, is_available, category_id, foto_url, categories(nama, jenis)"
          )
          .eq("is_available", true)
          .order("nama"),
        supabase.from("categories").select("nama").order("urutan"),
        supabase.from("tables").select("nama_meja").order("nama_meja"),
        fetchPendingSelfOrders(supabase),
      ]);
      if (!active) return;
      const rows = (menuRes.data ?? []) as unknown as {
        id: string;
        nama: string;
        harga: number;
        is_available: boolean;
        category_id: string;
        foto_url: string | null;
        categories: { nama: string; jenis: "makanan" | "minuman" } | null;
      }[];
      setMenu(
        rows.map((m) => ({
          id: m.id,
          nama: m.nama,
          harga: Number(m.harga),
          is_available: m.is_available,
          category_id: m.category_id,
          kategori: m.categories?.nama ?? "—",
          jenis: m.categories?.jenis ?? "makanan",
          foto_url: m.foto_url,
        }))
      );
      setKategoriList((catRes.data ?? []).map((c) => c.nama as string));
      const tnames = (tableRes.data ?? []).map((t) => t.nama_meja as string);
      setTables(tnames);
      setMeja((prev) => prev || tnames[0] || "");
      setPending(pendingRes);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [supabase]);

  // Realtime: self-order baru yang menunggu konfirmasi.
  React.useEffect(() => {
    const channel = supabase
      .channel("kasir-pending")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        async () => {
          const list = await fetchPendingSelfOrders(supabase);
          setPending(list);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const filtered = menu.filter(
    (m) =>
      (kategori === "Semua" || m.kategori === kategori) &&
      m.nama.toLowerCase().includes(query.toLowerCase())
  );

  function addToCart(item: MenuRow) {
    setCart((prev) => {
      const existing = prev.find((l) => l.item.id === item.id);
      if (existing) {
        return prev.map((l) =>
          l.item.id === item.id ? { ...l, qty: l.qty + 1 } : l
        );
      }
      return [...prev, { item, qty: 1 }];
    });
  }

  function changeQty(id: string, delta: number) {
    setCart((prev) =>
      prev
        .map((l) => (l.item.id === id ? { ...l, qty: l.qty + delta } : l))
        .filter((l) => l.qty > 0)
    );
  }

  const subtotal = cart.reduce((sum, l) => sum + l.item.harga * l.qty, 0);
  const pajak = Math.round((subtotal * PAJAK_PERSEN) / 100);
  const total = subtotal + pajak;

  function openPay() {
    if (cart.length === 0) return;
    if (tipe === "dinein" && !meja) {
      alert("Pilih meja untuk dine-in.");
      return;
    }
    setChannel(null);
    setUang("");
    setPayStep("method");
    setResult(null);
    setPayOpen(true);
  }

  function pickChannel(ch: PaymentChannel) {
    setChannel(ch);
    if (ch.metode === "tunai") {
      setUang("");
      setPayStep("tunai");
    } else {
      processPayment(ch, null);
    }
  }

  function processPayment(ch: PaymentChannel, kembalian: number | null) {
    const snapshot = cart.map((l) => ({
      nama: l.item.nama,
      qty: l.qty,
      harga: l.item.harga,
    }));
    const items: CartItemInput[] = cart.map((l) => ({
      menu_item_id: l.item.id,
      qty: l.qty,
      harga: l.item.harga,
    }));
    startSaving(async () => {
      const res = await createKasirOrder({
        tipe,
        tableNama: tipe === "dinein" ? meja || null : null,
        items,
        metodeId: ch.id,
      });
      if (res.ok) {
        setResult({
          meja: res.meja,
          nomorAntrian: res.nomorAntrian,
          items: snapshot,
          total: res.total,
          metodeLabel: METODE_LABEL[ch.metode],
          kembalian,
        });
        setCart([]);
      } else {
        alert(res.message ?? "Gagal menyimpan order.");
      }
    });
  }

  function newOrder() {
    setPayOpen(false);
    setResult(null);
    setChannel(null);
    setUang("");
    setPayStep("method");
  }

  function approve(id: string) {
    setPending((prev) => prev.filter((o) => o.id !== id)); // optimistik
    startSaving(async () => {
      await approveOrder(id);
    });
  }

  const KATEGORI = ["Semua", ...kategoriList];

  return (
    <div className="grid h-[calc(100vh-4rem)] grid-cols-1 lg:grid-cols-[1fr_380px]">
      {/* Kiri: menu */}
      <div className="flex flex-col overflow-hidden border-r border-border">
        {pending.length > 0 && (
          <PendingBar pending={pending} onApprove={approve} disabled={saving} />
        )}

        <div className="flex flex-col gap-3 border-b border-border p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari menu…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {KATEGORI.map((k) => (
              <Button
                key={k}
                size="sm"
                variant={kategori === k ? "default" : "outline"}
                onClick={() => setKategori(k)}
                className="shrink-0 transition-colors"
              >
                {k}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid flex-1 auto-rows-min grid-cols-2 gap-3 overflow-auto p-4 sm:grid-cols-3 xl:grid-cols-4">
          {loading ? (
            <p className="col-span-full mt-8 text-center text-sm text-muted-foreground">
              Memuat menu…
            </p>
          ) : filtered.length === 0 ? (
            <p className="col-span-full mt-8 text-center text-sm text-muted-foreground">
              Tidak ada menu yang cocok.
            </p>
          ) : (
            filtered.map((item) => (
              <button
                key={item.id}
                onClick={() => addToCart(item)}
                className={cn(
                  "flex min-h-[112px] flex-col items-start gap-2 rounded-xl border border-border bg-card p-3 text-left shadow-sm transition-[transform,box-shadow,border-color] duration-150 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
                )}
              >
                <MenuThumb
                  fotoUrl={item.foto_url}
                  jenis={item.jenis}
                  nama={item.nama}
                  className="h-16 w-full rounded-lg"
                />
                <span className="line-clamp-2 text-sm font-medium">{item.nama}</span>
                <span className="tabular mt-auto self-end text-sm font-semibold text-primary">
                  {formatRupiah(item.harga)}
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Kanan: keranjang */}
      <aside className="flex flex-col overflow-hidden bg-secondary/40">
        <div className="border-b border-primary/15 p-4">
          <h2 className="text-lg font-semibold">Keranjang</h2>

          {/* Tipe pesanan */}
          <div className="mt-3 grid grid-cols-2 gap-1 rounded-lg border border-input bg-background p-1">
            <TipeButton
              active={tipe === "dinein"}
              onClick={() => setTipe("dinein")}
              icon={Store}
              label="Dine-in"
            />
            <TipeButton
              active={tipe === "takeaway"}
              onClick={() => setTipe("takeaway")}
              icon={ShoppingBag}
              label="Bawa Pulang"
            />
          </div>

          {tipe === "dinein" ? (
            <div className="mt-2 flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Meja</label>
              <select
                value={meja}
                onChange={(e) => setMeja(e.target.value)}
                className="h-9 flex-1 rounded-md border border-input bg-background px-2 text-sm"
              >
                {tables.map((t) => (
                  <option key={t} value={t}>
                    Meja {t}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Pesanan bawa pulang — dapat nomor antrian saat dibayar.
            </p>
          )}
        </div>

        <div className="flex-1 overflow-auto p-4">
          {cart.length === 0 ? (
            <div className="mt-10 flex flex-col items-center gap-3 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <ShoppingCart className="h-7 w-7" />
              </div>
              <div>
                <p className="text-sm font-medium">Keranjang kosong</p>
                <p className="text-sm text-muted-foreground">
                  Ketuk menu di kiri untuk menambahkan item.
                </p>
              </div>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {cart.map((line) => (
                <li key={line.item.id} className="flex items-center gap-3">
                  <MenuThumb
                    fotoUrl={line.item.foto_url}
                    jenis={line.item.jenis}
                    nama={line.item.nama}
                    className="h-10 w-10 shrink-0 rounded-md"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{line.item.nama}</p>
                    <p className="tabular text-xs text-muted-foreground">
                      {formatRupiah(line.item.harga)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={() => changeQty(line.item.id, -1)}
                    >
                      {line.qty === 1 ? (
                        <Trash2 className="h-4 w-4" />
                      ) : (
                        <Minus className="h-4 w-4" />
                      )}
                    </Button>
                    <span className="w-6 text-center text-sm font-semibold">
                      {line.qty}
                    </span>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={() => changeQty(line.item.id, 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-3 border-t border-primary/15 p-4">
          <div className="space-y-1 text-sm">
            <Row label="Subtotal" value={formatRupiah(subtotal)} />
            <Row label={`Pajak (${PAJAK_PERSEN}%)`} value={formatRupiah(pajak)} />
            <div className="flex justify-between pt-1 text-base font-bold">
              <span>Total</span>
              <span className="tabular text-primary">{formatRupiah(total)}</span>
            </div>
          </div>
          <Button
            size="lg"
            className="w-full text-base"
            disabled={cart.length === 0 || saving}
            onClick={openPay}
          >
            Bayar · {formatRupiah(total)}
          </Button>
        </div>
      </aside>

      {/* Modal pembayaran / konfirmasi */}
      {payOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-4 shadow-xl">
            {result ? (
              <PaymentDone result={result} onNew={newOrder} />
            ) : (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {payStep === "tunai" && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setPayStep("method")}
                      >
                        <ArrowLeft className="h-5 w-5" />
                      </Button>
                    )}
                    <h2 className="text-lg font-semibold">
                      {payStep === "method" ? "Pilih Pembayaran" : "Pembayaran Tunai"}
                    </h2>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={saving}
                    onClick={() => setPayOpen(false)}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                {payStep === "method" ? (
                  <PaymentMethodPicker
                    total={total}
                    onPick={pickChannel}
                    disabled={saving}
                  />
                ) : (
                  <TunaiForm
                    total={total}
                    uang={uang}
                    setUang={setUang}
                    saving={saving}
                    onConfirm={(kembalian) =>
                      channel && processPayment(channel, kembalian)
                    }
                  />
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TipeButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Store;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-10 items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function TunaiForm({
  total,
  uang,
  setUang,
  saving,
  onConfirm,
}: {
  total: number;
  uang: string;
  setUang: (v: string) => void;
  saving: boolean;
  onConfirm: (kembalian: number) => void;
}) {
  const uangNum = Number(uang) || 0;
  const kembalian = uangNum - total;
  const cukup = uangNum >= total;
  // Nominal cepat.
  const presets = [total, 50000, 100000, 150000].filter(
    (v, i, arr) => arr.indexOf(v) === i
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between border-b border-border pb-3 text-base font-bold">
        <span>Total</span>
        <span className="tabular text-primary">{formatRupiah(total)}</span>
      </div>
      <div className="grid gap-1.5">
        <label className="text-sm font-medium">Uang diterima</label>
        <Input
          type="number"
          inputMode="numeric"
          value={uang}
          onChange={(e) => setUang(e.target.value)}
          placeholder="0"
          autoFocus
        />
        <div className="flex flex-wrap gap-2">
          {presets.map((v) => (
            <Button
              key={v}
              size="sm"
              variant="outline"
              onClick={() => setUang(String(v))}
            >
              {v === total ? "Uang pas" : formatRupiah(v)}
            </Button>
          ))}
        </div>
      </div>
      <div className="flex justify-between rounded-lg bg-muted/50 px-3 py-2 text-base font-bold">
        <span>Kembalian</span>
        <span className={cn("tabular", cukup ? "text-primary" : "text-muted-foreground")}>
          {cukup ? formatRupiah(kembalian) : "—"}
        </span>
      </div>
      <Button
        size="lg"
        className="w-full"
        disabled={!cukup || saving}
        onClick={() => onConfirm(kembalian)}
      >
        {saving ? "Memproses…" : "Konfirmasi Bayar"}
      </Button>
    </div>
  );
}

function PaymentDone({
  result,
  onNew,
}: {
  result: PayResult;
  onNew: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <div>
          <p className="text-lg font-semibold">Pembayaran berhasil</p>
          <p className="text-sm text-muted-foreground">
            {result.nomorAntrian
              ? `Bawa Pulang · Antrian #${result.nomorAntrian}`
              : `Dine-in · Meja ${result.meja ?? "—"}`}
          </p>
        </div>
      </div>

      <ul className="flex flex-col gap-1 border-y border-border py-3 text-sm">
        {result.items.map((it, i) => (
          <li key={i} className="flex justify-between">
            <span className="text-muted-foreground">
              {it.qty}× {it.nama}
            </span>
            <span className="tabular">{formatRupiah(it.harga * it.qty)}</span>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-1 text-sm">
        <div className="flex justify-between font-bold">
          <span>Total ({result.metodeLabel})</span>
          <span className="tabular text-primary">{formatRupiah(result.total)}</span>
        </div>
        {result.kembalian !== null && (
          <div className="flex justify-between text-muted-foreground">
            <span>Kembalian</span>
            <span className="tabular">{formatRupiah(result.kembalian)}</span>
          </div>
        )}
      </div>

      <Button size="lg" className="w-full" onClick={onNew}>
        Pesanan Baru
      </Button>
    </div>
  );
}

function PendingBar({
  pending,
  onApprove,
  disabled,
}: {
  pending: OrderRow[];
  onApprove: (id: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="border-b border-warning/40 bg-warning/10 p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-warning">
        <BellRing className="h-4 w-4" />
        {pending.length} pesanan self-order menunggu konfirmasi
      </div>
      <div className="flex gap-2 overflow-x-auto">
        {pending.map((o) => (
          <div
            key={o.id}
            className="flex min-w-56 shrink-0 flex-col gap-2 rounded-lg border border-border bg-card p-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">Meja {o.meja ?? "—"}</span>
              <span className="text-xs text-muted-foreground">
                {o.items.reduce((s, i) => s + i.qty, 0)} item
              </span>
            </div>
            <ul className="text-sm text-muted-foreground">
              {o.items.map((i) => (
                <li key={i.id} className="truncate">
                  {i.qty}× {i.nama}
                </li>
              ))}
            </ul>
            <Button
              size="sm"
              variant="success"
              className="w-full"
              disabled={disabled}
              onClick={() => onApprove(o.id)}
            >
              <Check className="h-4 w-4" /> Terima
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <span>{label}</span>
      <span className="tabular text-foreground">{value}</span>
    </div>
  );
}
