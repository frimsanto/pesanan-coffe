"use server";

import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/session-server";
import { getPaymentChannel } from "@/lib/payment";

const PAJAK_PERSEN = 10;

export type CartItemInput = {
  menu_item_id: string;
  qty: number;
  harga: number;
  catatan?: string;
};

export type KasirOrderInput = {
  tipe: "dinein" | "takeaway";
  /** hanya untuk dine-in; null untuk bawa pulang. */
  tableNama: string | null;
  items: CartItemInput[];
  /** id channel bayar dari PAYMENT_CHANNELS (qris/gopay/tunai/…). */
  metodeId: string;
};

export type KasirOrderResult =
  | {
      ok: true;
      orderId: string;
      nomorAntrian: number | null;
      meja: string | null;
      total: number;
    }
  | { ok: false; message: string };

/**
 * Order walk-in dari kasir: satu aksi = buat order + bayar (lunas).
 * Order langsung 'dikirim' (terverifikasi staf), muncul di dapur seketika.
 * Bawa pulang mendapat nomor antrian harian; dine-in menempati meja.
 */
export async function createKasirOrder(
  input: KasirOrderInput
): Promise<KasirOrderResult> {
  if (input.items.length === 0) return { ok: false, message: "Keranjang kosong." };

  const channel = getPaymentChannel(input.metodeId);
  if (!channel) return { ok: false, message: "Metode bayar tidak valid." };

  const user = await getSession();
  if (!user) return { ok: false, message: "Sesi berakhir." };

  const supabase = await createClient();

  // Resolusi meja (khusus dine-in).
  let tableId: string | null = null;
  let mejaNama: string | null = null;
  if (input.tipe === "dinein") {
    if (!input.tableNama) return { ok: false, message: "Pilih meja untuk dine-in." };
    const { data: t } = await supabase
      .from("tables")
      .select("id, nama_meja")
      .eq("outlet_id", user.outlet_id)
      .eq("nama_meja", input.tableNama)
      .maybeSingle();
    if (!t) return { ok: false, message: "Meja tidak ditemukan." };
    tableId = t.id;
    mejaNama = t.nama_meja;
  }

  // Nomor antrian (khusus bawa pulang).
  let nomorAntrian: number | null = null;
  if (input.tipe === "takeaway") {
    const { data: n } = await supabase.rpc("next_queue_number", {
      p_outlet: user.outlet_id,
    });
    nomorAntrian = (n as number | null) ?? 1;
  }

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({
      outlet_id: user.outlet_id,
      table_id: tableId,
      staff_id: user.id,
      status: "dikirim", // terverifikasi staf, langsung ke antrian dapur
      nomor_antrian: nomorAntrian,
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

  // Pembayaran (lunas) — total termasuk pajak.
  const subtotal = input.items.reduce((s, it) => s + it.harga * it.qty, 0);
  const total = subtotal + Math.round((subtotal * PAJAK_PERSEN) / 100);
  const { error: payErr } = await supabase.from("payments").insert({
    order_id: order.id,
    metode: channel.metode,
    jumlah: total,
    status: "lunas",
  });
  if (payErr) return { ok: false, message: payErr.message };

  // Dine-in menempati meja (status 'terisi').
  if (tableId) {
    await supabase.rpc("touch_table", { p_table_id: tableId });
  }

  return { ok: true, orderId: order.id, nomorAntrian, meja: mejaNama, total };
}

/**
 * Staf menyetujui pesanan self-order: menunggu_konfirmasi -> diterima.
 * Sekaligus menandai pembayaran tunai (pending) menjadi lunas — approve
 * di kasir berarti uang tunai sudah diterima.
 */
export async function approveOrder(orderId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("orders")
    .update({ status: "diterima" })
    .eq("id", orderId)
    .eq("status", "menunggu_konfirmasi");
  if (error) return { ok: false, message: error.message };

  // Pelunasan pembayaran tunai yang masih pending untuk order ini.
  await supabase
    .from("payments")
    .update({ status: "lunas" })
    .eq("order_id", orderId)
    .eq("status", "pending");

  return { ok: true };
}
