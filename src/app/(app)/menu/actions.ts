"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type MenuInput = {
  nama: string;
  harga: number;
  category_id: string;
  is_available: boolean;
  foto_url: string | null;
};

export async function createMenu(input: MenuInput) {
  const supabase = await createClient();
  const { error } = await supabase.from("menu_items").insert({
    nama: input.nama,
    harga: input.harga,
    category_id: input.category_id,
    is_available: input.is_available,
    foto_url: input.foto_url,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/menu");
  revalidatePath("/kasir");
  return { ok: true };
}

export async function updateMenu(id: string, input: MenuInput) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("menu_items")
    .update({
      nama: input.nama,
      harga: input.harga,
      category_id: input.category_id,
      is_available: input.is_available,
      foto_url: input.foto_url,
    })
    .eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/menu");
  revalidatePath("/kasir");
  return { ok: true };
}

export async function deleteMenu(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("menu_items").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/menu");
  revalidatePath("/kasir");
  return { ok: true };
}
