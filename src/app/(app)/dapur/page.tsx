"use client";

import * as React from "react";
import { Clock, ChefHat, CheckCircle2, Utensils } from "lucide-react";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { OrderRow } from "@/lib/db-types";
import { fetchKitchenOrders } from "@/lib/queries";
import {
  kitchenStage,
  nextKitchenStatus,
  STAGE_LABEL,
  type KitchenStage,
} from "@/lib/orders";
import { Button } from "@/components/ui/button";
import { advanceOrderStatus, markPickedUp } from "./actions";

const STAGE_STYLE: Record<
  KitchenStage,
  { card: string; strip: string; badge: string; nextLabel: string | null }
> = {
  baru: {
    card: "border-warning/60",
    strip: "bg-warning",
    badge: "bg-warning text-warning-foreground",
    nextLabel: "Mulai proses",
  },
  proses: {
    card: "border-sky-500/60",
    strip: "bg-sky-500",
    badge: "bg-sky-500 text-white",
    nextLabel: "Tandai siap",
  },
  siap: {
    card: "border-success/60",
    strip: "bg-success",
    badge: "bg-success text-success-foreground",
    nextLabel: null,
  },
};

export default function DapurPage() {
  const supabase = React.useMemo(() => createClient(), []);
  const [orders, setOrders] = React.useState<OrderRow[] | null>(null);
  const [now, setNow] = React.useState(() => Date.now());

  const refresh = React.useCallback(async () => {
    const list = await fetchKitchenOrders(supabase);
    setOrders(list);
  }, [supabase]);

  React.useEffect(() => {
    refresh();
    const timer = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(timer);
  }, [refresh]);

  // Realtime: tiket baru / perubahan status otomatis muncul.
  React.useEffect(() => {
    const channel = supabase
      .channel("dapur-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items" },
        () => refresh()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, refresh]);

  async function advance(order: OrderRow) {
    // Optimistik: langsung majukan tampilan, DB & realtime menyusul.
    const next = nextKitchenStatus(order.status);
    if (next) {
      setOrders((prev) =>
        prev
          ? prev.map((o) => (o.id === order.id ? { ...o, status: next } : o))
          : prev
      );
    }
    await advanceOrderStatus(order.id, order.status);
  }

  async function pickup(order: OrderRow) {
    // Optimistik: tiket bawa-pulang hilang dari antrian saat ditandai selesai.
    setOrders((prev) => (prev ? prev.filter((o) => o.id !== order.id) : prev));
    await markPickedUp(order.id);
  }

  const grouped = React.useMemo(() => {
    if (!orders) return [];
    const byMeja = new Map<string, OrderRow[]>();
    for (const o of orders) {
      const key = o.meja ?? (o.nomor_antrian ? `#${o.nomor_antrian}` : "—");
      const list = byMeja.get(key) ?? [];
      list.push(o);
      byMeja.set(key, list);
    }
    const ts = (o: OrderRow) => new Date(o.dibuat_pada).getTime();
    return Array.from(byMeja.entries())
      .map(([meja, list]) => ({
        meja,
        list: [...list].sort((a, b) => ts(a) - ts(b)),
        oldest: Math.min(...list.map(ts)),
      }))
      .sort((a, b) => a.oldest - b.oldest);
  }, [orders]);

  const totalTiket = orders?.length ?? 0;

  return (
    <div className="p-4 md:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dapur</h1>
          <p className="text-sm text-muted-foreground">
            Antrian pesanan masuk · dikelompokkan per meja · live
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-base font-semibold">
          <Utensils className="h-5 w-5 text-muted-foreground" />
          {totalTiket} tiket aktif
        </div>
      </div>

      {orders === null ? (
        <p className="text-sm text-muted-foreground">Memuat tiket…</p>
      ) : grouped.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {grouped.map((group) =>
            group.list.map((order) => (
              <OrderTicket
                key={order.id}
                order={order}
                now={now}
                onAdvance={() => advance(order)}
                onPickup={() => pickup(order)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function OrderTicket({
  order,
  now,
  onAdvance,
  onPickup,
}: {
  order: OrderRow;
  now: number;
  onAdvance: () => void;
  onPickup: () => void;
}) {
  const stage = kitchenStage(order.status) ?? "baru";
  const style = STAGE_STYLE[stage];
  const createdAt = new Date(order.dibuat_pada).getTime();
  const menit = Math.max(0, Math.floor((now - createdAt) / 60_000));
  const takeaway = order.nomor_antrian != null;

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border-2 bg-card shadow-sm transition-colors",
        style.card
      )}
    >
      <div className={cn("h-1.5 w-full", style.strip)} />
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {takeaway ? "Bawa Pulang" : "Meja"}
            </p>
            <p className="text-2xl font-bold leading-tight">
              {takeaway ? `#${order.nomor_antrian}` : (order.meja ?? "—")}
            </p>
          </div>
          <span
            className={cn(
              "rounded-full px-3 py-1 text-sm font-semibold",
              style.badge
            )}
          >
            {STAGE_LABEL[stage]}
          </span>
        </div>

        <ul className="flex flex-col gap-2 border-t border-border pt-3">
          {order.items.map((item) => (
            <li key={item.id} className="flex gap-3 text-base">
              <span className="min-w-8 shrink-0 font-bold text-primary">
                {item.qty}×
              </span>
              <div className="min-w-0">
                <p className="font-medium leading-snug">{item.nama}</p>
                {item.catatan && (
                  <p className="text-sm text-muted-foreground">↳ {item.catatan}</p>
                )}
              </div>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
          <span className="text-muted-foreground">
            Masuk{" "}
            {new Date(createdAt).toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          <span
            className={cn(
              "flex items-center gap-1 font-semibold",
              menit >= 15
                ? "text-destructive"
                : menit >= 8
                  ? "text-warning"
                  : "text-muted-foreground"
            )}
          >
            <Clock className="h-4 w-4" />
            {menit} menit
          </span>
        </div>

        {nextKitchenStatus(order.status) ? (
          <Button
            size="lg"
            variant={stage === "baru" ? "warning" : "default"}
            className="w-full text-base"
            onClick={onAdvance}
          >
            {stage === "baru" ? (
              <ChefHat className="h-5 w-5" />
            ) : (
              <CheckCircle2 className="h-5 w-5" />
            )}
            {style.nextLabel}
          </Button>
        ) : takeaway ? (
          <Button
            size="lg"
            variant="success"
            className="w-full text-base"
            onClick={onPickup}
          >
            <CheckCircle2 className="h-5 w-5" />
            Sudah Diambil
          </Button>
        ) : (
          <div className="flex items-center justify-center gap-2 rounded-md bg-success/10 py-3 text-base font-semibold text-success">
            <CheckCircle2 className="h-5 w-5" />
            Siap disajikan
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <ChefHat className="h-8 w-8" />
      </div>
      <div>
        <p className="text-lg font-semibold">Tidak ada pesanan</p>
        <p className="text-sm text-muted-foreground">
          Tiket baru akan muncul otomatis saat ada pesanan masuk.
        </p>
      </div>
    </div>
  );
}
