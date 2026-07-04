"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { TableRow } from "@/lib/db-types";

/**
 * Kosongkan meja (staff menekan "Tutup Meja" saat membersihkan meja / pelanggan
 * pergi). Menutup sesi QR aktif & mengembalikan status meja ke 'tersedia'.
 */
export async function freeTable(tableId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("free_table", { p_table_id: tableId });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/meja");
  return { ok: true };
}

/**
 * Override manual status meja oleh staf — status otomatis (touch/settle) hanya
 * default, staf tetap bisa memaksa kapan saja:
 *   • 'tersedia' -> free_table (tutup sesi aktif + kosongkan),
 *   • 'terisi'   -> touch_table (tandai terisi),
 *   • 'reserved' -> set langsung (booking).
 */
export async function setTableStatus(
  tableId: string,
  status: TableRow["status"]
) {
  if (status === "tersedia") return freeTable(tableId);

  const supabase = await createClient();
  if (status === "terisi") {
    const { error } = await supabase.rpc("touch_table", { p_table_id: tableId });
    if (error) return { ok: false, message: error.message };
  } else {
    const { error } = await supabase
      .from("tables")
      .update({ status: "reserved" })
      .eq("id", tableId);
    if (error) return { ok: false, message: error.message };
  }
  revalidatePath("/meja");
  return { ok: true };
}
