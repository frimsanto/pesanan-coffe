"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import {
  Minus,
  Plus,
  ShoppingBag,
  X,
  Coffee,
  Clock,
  ArrowLeft,
  QrCode,
  Wallet,
  Landmark,
  Banknote,
} from "lucide-react";

import { cn, formatRupiah } from "@/lib/utils";
import { CAFE_NAMA } from "@/lib/mock-data";
import { createClient } from "@/lib/supabase/client";
import type { MenuRow } from "@/lib/db-types";
import { MenuThumb } from "@/components/menu-thumb";
import { CUSTOMER_STATUS_LABEL, type OrderStatus } from "@/lib/orders";
import {
  PAYMENT_CHANNELS,
  PAYMENT_GROUP_LABEL,
  type PaymentChannel,
  type PaymentGroup,
} from "@/lib/payment";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { submitSelfOrder } from "./actions";

type CartLine = { item: MenuRow; qty: number };
type ActiveOrder = { id: string; status: OrderStatus; paid: boolean };
type PayStep = "cart" | "method";
/** Ringkasan pesanan terakhir untuk layar konfirmasi. */
type OrderSummary = { channel: PaymentChannel; totalItem: number; total: number };

const GROUP_ICON: Record<PaymentGroup, typeof QrCode> = {
  qris: QrCode,
  ewallet: Wallet,
  transfer: Landmark,
  tunai: Banknote,
};

export default function SelfOrderPage() {
  const params = useParams<{ table_id: string }>();
  const tableId = params.table_id;
  const supabase = React.useMemo(() => createClient(), []);

  const [menu, setMenu] = React.useState<MenuRow[]>([]);
  const [kategoriList, setKategoriList] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [kategori, setKategori] = React.useState<string>("Semua");
  const [cart, setCart] = React.useState<CartLine[]>([]);
  const [open, setOpen] = React.useState(false);
  const [payStep, setPayStep] = React.useState<PayStep>("cart");
  const [order, setOrder] = React.useState<ActiveOrder | null>(null);
  const [summary, setSummary] = React.useState<OrderSummary | null>(null);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [sending, startSending] = React.useTransition();

  // Swipe-down untuk menutup bottom sheet (gestur pada area grabber).
  const [dragY, setDragY] = React.useState(0);
  const dragStart = React.useRef<number | null>(null);

  function closeSheet() {
    setOpen(false);
    setPayStep("cart");
    setDragY(0);
    dragStart.current = null;
  }

  function onHandleStart(e: React.TouchEvent) {
    dragStart.current = e.touches[0].clientY;
  }
  function onHandleMove(e: React.TouchEvent) {
    if (dragStart.current == null) return;
    const dy = e.touches[0].clientY - dragStart.current;
    if (dy > 0) setDragY(dy);
  }
  function onHandleEnd() {
    if (dragY > 90) closeSheet();
    else setDragY(0);
    dragStart.current = null;
  }

  function pickChannel(ch: PaymentChannel) {
    submitOrder(ch);
  }

  // Muat menu.
  React.useEffect(() => {
    let active = true;
    (async () => {
      const [menuRes, catRes] = await Promise.all([
        supabase
          .from("menu_items")
          .select(
            "id, nama, harga, is_available, category_id, foto_url, categories(nama, jenis)"
          )
          .order("nama"),
        supabase.from("categories").select("nama").order("urutan"),
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
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [supabase]);

  // Realtime: pantau status order milik pelanggan ini.
  React.useEffect(() => {
    if (!order) return;
    const channel = supabase
      .channel(`order-${order.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${order.id}`,
        },
        (payload) => {
          const next = (payload.new as { status: OrderStatus }).status;
          setOrder((prev) => (prev ? { ...prev, status: next } : prev));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, order?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = menu.filter((m) => kategori === "Semua" || m.kategori === kategori);

  function changeQty(item: MenuRow, delta: number) {
    setCart((prev) => {
      const existing = prev.find((l) => l.item.id === item.id);
      if (!existing && delta > 0) return [...prev, { item, qty: 1 }];
      return prev
        .map((l) => (l.item.id === item.id ? { ...l, qty: l.qty + delta } : l))
        .filter((l) => l.qty > 0);
    });
  }

  const qtyOf = (id: string) => cart.find((l) => l.item.id === id)?.qty ?? 0;
  const totalItem = cart.reduce((s, l) => s + l.qty, 0);
  const subtotal = cart.reduce((s, l) => s + l.item.harga * l.qty, 0);

  function submitOrder(ch: PaymentChannel) {
    const snapItems = totalItem;
    const snapTotal = subtotal;
    startSending(async () => {
      const res = await submitSelfOrder({
        tableNama: tableId,
        items: cart.map((l) => ({
          menu_item_id: l.item.id,
          qty: l.qty,
          harga: l.item.harga,
        })),
        channelId: ch.id,
      });
      if (res.ok && res.orderId) {
        setOrder({
          id: res.orderId,
          status: res.status as OrderStatus,
          paid: Boolean(res.paid),
        });
        setSummary({ channel: ch, totalItem: snapItems, total: snapTotal });
        setShowConfirm(true);
        setCart([]);
        closeSheet();
      } else {
        alert(res.message ?? "Gagal mengirim pesanan.");
      }
    });
  }

  const KATEGORI = ["Semua", ...kategoriList];

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background">
      {/* Header — jelas ini menu meja pelanggan, bukan halaman staf */}
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 text-base font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              ☕
            </span>
            {CAFE_NAMA}
          </div>
          <ThemeToggle />
        </div>
        <div className="bg-primary px-4 py-4 text-primary-foreground">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] opacity-75">
            Meja
          </p>
          <p className="text-4xl font-bold leading-none tracking-tight tabular-nums">
            {tableId}
          </p>
        </div>
      </header>

      {/* Kategori */}
      <div className="sticky top-[128px] z-10 flex gap-2 overflow-x-auto border-b border-border bg-background px-4 py-2">
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

      {/* Daftar menu */}
      <div className="flex flex-1 flex-col gap-3 p-4 pb-28">
        {loading ? (
          <p className="mt-8 text-center text-sm text-muted-foreground">Memuat menu…</p>
        ) : (
          filtered.map((item) => {
            const qty = qtyOf(item.id);
            return (
              <div
                key={item.id}
                className={cn(
                  "flex items-center gap-3 rounded-xl border border-border bg-card p-3",
                  !item.is_available && "opacity-50"
                )}
              >
                <MenuThumb
                  fotoUrl={item.foto_url}
                  jenis={item.jenis}
                  nama={item.nama}
                  className="h-14 w-14 shrink-0 rounded-lg"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{item.nama}</p>
                  <p className="tabular text-sm font-semibold text-primary">
                    {formatRupiah(item.harga)}
                  </p>
                  {!item.is_available && (
                    <p className="text-xs text-destructive">Habis</p>
                  )}
                </div>
                {item.is_available &&
                  (qty === 0 ? (
                    <Button size="icon" onClick={() => changeQty(item, 1)}>
                      <Plus className="h-5 w-5" />
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-9 w-9"
                        onClick={() => changeQty(item, -1)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-5 text-center font-semibold">{qty}</span>
                      <Button
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => changeQty(item, 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
              </div>
            );
          })
        )}
      </div>

      {/* Floating cart button (ala Grab/Gojek): bulat, pojok kanan-bawah.
          Selalu mengambang di atas konten; sembunyi total saat keranjang kosong. */}
      {totalItem > 0 ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-md justify-end p-4">
          <button
            onClick={() => setOpen(true)}
            aria-label={`Buka keranjang, ${totalItem} item`}
            className="pointer-events-auto relative flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform duration-150 hover:scale-105 active:scale-95"
          >
            <ShoppingBag className="h-6 w-6" />
            <span
              key={totalItem}
              className="badge-pop absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-background bg-(--merah-bata) px-1 text-xs font-bold tabular-nums text-white"
            >
              {totalItem}
            </span>
          </button>
        </div>
      ) : order && !showConfirm ? (
        <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md p-4">
          <button
            onClick={() => setShowConfirm(true)}
            className="flex h-14 w-full items-center justify-between rounded-lg border border-border bg-card px-4 text-left shadow-lg transition-colors hover:bg-accent"
          >
            <span className="flex items-center gap-2.5">
              <span className="flex h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
              <span className="leading-tight">
                <span className="block text-xs text-muted-foreground">
                  Status pesanan
                </span>
                <span className="text-sm font-semibold">
                  {CUSTOMER_STATUS_LABEL[order.status]}
                </span>
              </span>
            </span>
            <span className="text-sm font-medium text-primary">Lihat Status</span>
          </button>
        </div>
      ) : null}

      {/* Bottom sheet keranjang + pembayaran (max 70% tinggi layar) */}
      {open && (
        <div
          className="backdrop-in fixed inset-0 z-30 flex flex-col justify-end bg-black/60"
          onClick={closeSheet}
        >
          <div
            className="sheet-up mx-auto flex max-h-[70vh] w-full max-w-md flex-col rounded-t-2xl border-t border-border bg-card"
            style={dragY ? { transform: `translateY(${dragY}px)` } : undefined}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Grabber — area swipe-down untuk menutup */}
            <div
              className="flex shrink-0 cursor-grab touch-none justify-center pb-1 pt-3 active:cursor-grabbing"
              onTouchStart={onHandleStart}
              onTouchMove={onHandleMove}
              onTouchEnd={onHandleEnd}
            >
              <span className="h-1.5 w-10 rounded-full bg-muted-foreground/30" />
            </div>

            <div className="flex shrink-0 items-center justify-between px-4 pb-3">
              <div className="flex items-center gap-1">
                {payStep === "method" && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setPayStep("cart")}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                )}
                <h2 className="text-lg font-semibold">
                  {payStep === "cart"
                    ? `Keranjang · Meja ${tableId}`
                    : "Pilih Pembayaran"}
                </h2>
              </div>
              <Button size="icon" variant="ghost" onClick={closeSheet}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="min-h-0 flex-1 overflow-auto px-4 pb-4">
              {payStep === "cart" && (
                <>
                  <ul className="mb-4 flex flex-col gap-3">
                    {cart.map((l) => (
                      <li key={l.item.id} className="flex items-center gap-3">
                        <MenuThumb
                          fotoUrl={l.item.foto_url}
                          jenis={l.item.jenis}
                          nama={l.item.nama}
                          className="h-10 w-10 shrink-0 rounded-md"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{l.item.nama}</p>
                          <p className="tabular text-xs text-muted-foreground">
                            {l.qty} × {formatRupiah(l.item.harga)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                            onClick={() => changeQty(l.item, -1)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-5 text-center text-sm font-semibold">
                            {l.qty}
                          </span>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                            onClick={() => changeQty(l.item, 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="mb-3 flex justify-between border-t border-primary/15 pt-3 text-base font-bold">
                    <span>Total</span>
                    <span className="tabular text-primary">
                      {formatRupiah(subtotal)}
                    </span>
                  </div>
                  <Button
                    size="lg"
                    className="w-full"
                    disabled={cart.length === 0}
                    onClick={() => setPayStep("method")}
                  >
                    Lanjut ke Pembayaran
                  </Button>
                </>
              )}

              {payStep === "method" && (
                <MethodList total={subtotal} onPick={pickChannel} disabled={sending} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Layar konfirmasi (full screen) setelah metode bayar dipilih */}
      {showConfirm && order && summary && (
        <ConfirmationScreen
          tableId={tableId}
          status={order.status}
          summary={summary}
          onOrderAgain={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
}

function MethodList({
  total,
  onPick,
  disabled,
}: {
  total: number;
  onPick: (ch: PaymentChannel) => void;
  disabled: boolean;
}) {
  const groups: PaymentGroup[] = ["qris", "ewallet", "transfer", "tunai"];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between border-b border-border pb-3 text-base font-bold">
        <span>Total</span>
        <span className="tabular text-primary">{formatRupiah(total)}</span>
      </div>
      {groups.map((g) => {
        const items = PAYMENT_CHANNELS.filter((c) => c.group === g);
        const Icon = GROUP_ICON[g];
        return (
          <div key={g}>
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Icon className="h-4 w-4" /> {PAYMENT_GROUP_LABEL[g]}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {items.map((c) => (
                <Button
                  key={c.id}
                  variant="outline"
                  className="justify-start"
                  disabled={disabled}
                  onClick={() => onPick(c)}
                >
                  {c.label}
                </Button>
              ))}
            </div>
          </div>
        );
      })}
      <p className="text-center text-xs text-muted-foreground">
        Pesanan dikonfirmasi kasir terlebih dahulu sebelum diproses.
      </p>
    </div>
  );
}

function ConfirmationScreen({
  tableId,
  status,
  summary,
  onOrderAgain,
}: {
  tableId: string;
  status: OrderStatus;
  summary: OrderSummary;
  onOrderAgain: () => void;
}) {
  const { channel, totalItem, total } = summary;
  return (
    <div className="fixed inset-0 z-40 mx-auto flex max-w-md flex-col overflow-auto bg-background">
      <div className="flex flex-1 flex-col items-center px-6 pb-6 pt-16 text-center">
        {/* Ikon cangkir — konsisten dengan brand, bukan centang hijau generik */}
        <div className="senja-rise flex h-20 w-20 items-center justify-center rounded-2xl border border-primary/40 bg-primary/10 text-primary">
          <Coffee className="h-9 w-9" />
        </div>

        <h1 className="senja-rise mt-5 text-2xl font-bold tracking-tight">
          Pesanan diterima
        </h1>
        <div className="senja-rise mt-2 inline-flex items-center gap-2 rounded-full bg-warning/15 px-3 py-1 text-sm font-medium text-warning">
          <Clock className="h-4 w-4" />
          {CUSTOMER_STATUS_LABEL[status]}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Kasir akan mengonfirmasi pesananmu.
        </p>

        {/* Ringkasan */}
        <div className="mt-6 w-full rounded-xl border border-border bg-card p-4 text-left">
          <SummaryRow label="Meja" value={tableId} />
          <SummaryRow label="Jumlah item" value={`${totalItem} item`} />
          <div className="my-2 border-t border-primary/15" />
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Total</span>
            <span className="tabular text-base font-bold text-primary">
              {formatRupiah(total)}
            </span>
          </div>
        </div>

        {/* Info pembayaran — gateway belum terintegrasi */}
        <div className="mt-3 w-full rounded-xl border border-border bg-muted/40 p-4 text-left">
          <p className="eyebrow text-muted-foreground">Pembayaran</p>
          {channel.online ? (
            <>
              <p className="mt-1.5 text-sm font-medium">{channel.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Instruksi pembayaran akan segera hadir.
              </p>
            </>
          ) : (
            <>
              <p className="mt-1.5 text-sm font-medium">Tunai di Kasir</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Kasir akan mengonfirmasi saat menerima pembayaran di meja atau
                counter.
              </p>
            </>
          )}
        </div>
      </div>

      <div className="sticky bottom-0 border-t border-border bg-background p-4">
        <Button size="lg" className="w-full" onClick={onOrderAgain}>
          Pesan Lagi
        </Button>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular font-medium">{value}</span>
    </div>
  );
}
