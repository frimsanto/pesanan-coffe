import { createClient } from "@/lib/supabase/server";
import type { CategoryRow, MenuRow } from "@/lib/db-types";
import { MenuManager } from "./menu-manager";

export const dynamic = "force-dynamic";

type MenuJoin = {
  id: string;
  nama: string;
  harga: number;
  is_available: boolean;
  category_id: string;
  foto_url: string | null;
  categories: { nama: string; jenis: "makanan" | "minuman" } | null;
};

export default async function MenuPage() {
  const supabase = await createClient();

  const [{ data: cats }, { data: items }] = await Promise.all([
    supabase.from("categories").select("id, nama, urutan, jenis").order("urutan"),
    supabase
      .from("menu_items")
      .select(
        "id, nama, harga, is_available, category_id, foto_url, categories(nama, jenis)"
      )
      .order("nama"),
  ]);

  const categories = (cats ?? []) as CategoryRow[];
  const menu: MenuRow[] = ((items ?? []) as unknown as MenuJoin[]).map((m) => ({
    id: m.id,
    nama: m.nama,
    harga: Number(m.harga),
    is_available: m.is_available,
    category_id: m.category_id,
    kategori: m.categories?.nama ?? "—",
    jenis: m.categories?.jenis ?? "makanan",
    foto_url: m.foto_url,
  }));

  return <MenuManager categories={categories} menu={menu} />;
}
