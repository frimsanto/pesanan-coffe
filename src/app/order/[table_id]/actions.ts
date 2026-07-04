"use server";

import { randomUUID } from "crypto";

import { createClient } from "@/lib/supabase/server";
import type { CartItemInput } from "@/app/(app)/kasir/actions";
import { getPaymentChannel } from "@/lib/payment";

export type SelfOrderInput = {
  tableNama: string;
  items: CartItemInput[];
  /** id channel dari PAYMENT_CHANNELS (mis. "qris", "gopay", "tunai"). */
  channelId: string;
};

/**
 * Checkout self-order pelanggan (dok. bagian 10.2 & 10.4):
 *  - pastikan ada qr_session aktif untuk meja (buat bila belum ada),
 *  - catat pembayaran sebagai 'pending'.
 *
 * Payment gateway asli belum diintegrasikan, jadi tidak ada metode yang
 * benar-benar "lunas seketika". Semua self-order masuk sebagai
 * 'menunggu_konfirmasi' sampai kasir mengonfirmasi (via PendingBar di
 * halaman kasir) — baik pembayaran online maupun tunai di kasir.
 */
export async function submitSelfOrder(input: SelfOrderInput) {
  if (input.items.length === 0) return { ok: false, message: "Keranjang kosong." };

  const channel = getPaymentChannel(input.channelId);
  if (!channel) return { ok: false, message: "Metode bayar tidak valid." };

  const supabase = await createClient();

  // Resolusi meja (butuh outlet_id + table_id).
  const { data: table } = await supabase
    .from("tables")
    .select("id, outlet_id")
    .eq("nama_meja", input.tableNama)
    .maybeSingle();

  if (!table) return { ok: false, message: "Meja tidak ditemukan." };

  // Cari sesi meja yang masih aktif, atau buat baru (running tab).
  const { data: existing } = await supabase
    .from("qr_sessions")
    .select("id")
    .eq("table_id", table.id)
    .eq("status", "aktif")
    .order("dibuat_pada", { ascending: false })
    .maybeSingle();

  let sessionId = existing?.id ?? null;
  if (!sessionId) {
    const { data: created, error: sessErr } = await supabase
      .from("qr_sessions")
      .insert({
        table_id: table.id,
        session_token: randomUUID(),
        status: "aktif",
        kadaluarsa_pada: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
      })
      .select("id")
      .single();
    if (sessErr || !created) {
      return { ok: false, message: sessErr?.message ?? "Gagal membuat sesi." };
    }
    sessionId = created.id;
  }

  // Gateway belum ada: semua self-order menunggu konfirmasi kasir dulu.
  const status = "menunggu_konfirmasi";

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({
      outlet_id: table.outlet_id,
      table_id: table.id,
      qr_session_id: sessionId,
      staff_id: null, // self-order pelanggan
      status,
    })
    .select("id")
    .single();

  if (orderErr || !order) {
    return { ok: false, message: orderErr?.message ?? "Gagal membuat order." };
  }

  const rows = input.items.map((it) => ({
    order_id: order.id,
    menu_item_id: it.menu_item_id,
    qty: it.qty,
    catatan: it.catatan ?? null,
    harga_saat_itu: it.harga,
  }));
  const { error: itemsErr } = await supabase.from("order_items").insert(rows);
  if (itemsErr) return { ok: false, message: itemsErr.message };

  // Catat pembayaran.
  const total = input.items.reduce((s, it) => s + it.harga * it.qty, 0);
  const { error: payErr } = await supabase.from("payments").insert({
    order_id: order.id,
    metode: channel.metode,
    jumlah: total,
    status: "pending",
    referensi_gateway: null,
  });
  if (payErr) return { ok: false, message: payErr.message };

  // Tandai meja terisi + catat aktivitas (papan meja otomatis update).
  await supabase.rpc("touch_table", { p_table_id: table.id });

  return { ok: true, orderId: order.id, status, paid: false };
}
