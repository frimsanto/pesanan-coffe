import type { SupabaseClient } from "@supabase/supabase-js";

import type { OrderRow } from "@/lib/db-types";
import { KITCHEN_STATUSES, type OrderStatus } from "@/lib/orders";

// Bentuk mentah hasil nested-select Supabase.
type RawOrder = {
  id: string;
  status: OrderStatus;
  dibuat_pada: string;
  nomor_antrian: number | null;
  tables: { nama_meja: string } | null;
  order_items: {
    id: string;
    qty: number;
    catatan: string | null;
    menu_items: { nama: string } | null;
  }[];
};

const SELECT =
  "id, status, dibuat_pada, nomor_antrian, tables(nama_meja), order_items(id, qty, catatan, menu_items(nama))";

function mapOrder(raw: RawOrder): OrderRow {
  return {
    id: raw.id,
    status: raw.status,
    dibuat_pada: raw.dibuat_pada,
    meja: raw.tables?.nama_meja ?? null,
    nomor_antrian: raw.nomor_antrian ?? null,
    items: (raw.order_items ?? []).map((oi) => ({
      id: oi.id,
      nama: oi.menu_items?.nama ?? "Item",
      qty: oi.qty,
      catatan: oi.catatan,
    })),
  };
}

/** Order yang sedang aktif di dapur (dikirim/diterima/diproses/siap). */
export async function fetchKitchenOrders(
  supabase: SupabaseClient
): Promise<OrderRow[]> {
  const { data } = await supabase
    .from("orders")
    .select(SELECT)
    .in("status", KITCHEN_STATUSES)
    .order("dibuat_pada", { ascending: true });
  return ((data ?? []) as unknown as RawOrder[]).map(mapOrder);
}

/** Self-order pelanggan yang menunggu persetujuan staf. */
export async function fetchPendingSelfOrders(
  supabase: SupabaseClient
): Promise<OrderRow[]> {
  const { data } = await supabase
    .from("orders")
    .select(SELECT)
    .eq("status", "menunggu_konfirmasi")
    .order("dibuat_pada", { ascending: true });
  return ((data ?? []) as unknown as RawOrder[]).map(mapOrder);
}
