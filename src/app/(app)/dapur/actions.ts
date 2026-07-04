"use server";

import { createClient } from "@/lib/supabase/server";
import { nextKitchenStatus, type OrderStatus } from "@/lib/orders";

/** Maju satu tahap alur dapur (baru -> diproses -> siap) di database. */
export async function advanceOrderStatus(orderId: string, current: OrderStatus) {
  const next = nextKitchenStatus(current);
  if (!next) return { ok: false, message: "Sudah tahap akhir." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("orders")
    .update({ status: next })
    .eq("id", orderId);
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

/**
 * Tandai tiket selesai: 'siap' -> 'selesai'. Dipakai untuk dine-in
 * ("Selesai" — sudah diantar ke meja) maupun bawa pulang ("Sudah Diambil").
 * Tiket hilang dari papan aktif /dapur; tetap tersimpan & terlihat di /riwayat.
 */
export async function markPickedUp(orderId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("orders")
    .update({ status: "selesai", ditutup_pada: new Date().toISOString() })
    .eq("id", orderId)
    .eq("status", "siap");
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}
