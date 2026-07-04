// Bentuk baris hasil query Supabase yang dipakai UI.

import type { OrderStatus } from "@/lib/orders";

export type JenisKategori = "makanan" | "minuman";

export type CategoryRow = {
  id: string;
  nama: string;
  urutan: number;
  jenis: JenisKategori;
};

export type MenuRow = {
  id: string;
  nama: string;
  harga: number;
  is_available: boolean;
  category_id: string;
  kategori: string; // nama kategori (hasil join)
  jenis: JenisKategori; // makanan / minuman (untuk ikon placeholder)
  foto_url: string | null;
};

export type TableRow = {
  id: string;
  nama_meja: string;
  status: "tersedia" | "terisi" | "reserved";
  kapasitas: number;
};

export type OrderItemRow = {
  id: string;
  nama: string; // snapshot nama menu
  qty: number;
  catatan: string | null;
};

export type OrderRow = {
  id: string;
  status: OrderStatus;
  dibuat_pada: string;
  meja: string | null;
  nomor_antrian: number | null; // bawa pulang; null = dine-in / self-order
  items: OrderItemRow[];
};
