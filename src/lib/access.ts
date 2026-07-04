// Hak akses per peran (dipakai bersama oleh proxy.ts & AppShell).
// Satu sumber kebenaran supaya blokir route dan tampilan sidebar konsisten.

import type { UserRole } from "@/lib/session";

// Prefix route area staf yang boleh diakses tiap peran.
export const ROLE_ROUTES: Record<UserRole, string[]> = {
  owner: ["/kasir", "/meja", "/dapur", "/menu", "/laporan", "/riwayat"],
  manager: ["/kasir", "/meja", "/dapur", "/menu", "/laporan", "/riwayat"],
  kasir: ["/kasir", "/meja", "/riwayat"],
  waiter: ["/kasir", "/meja", "/riwayat"],
  dapur: ["/dapur"],
};

// Halaman utama tiap peran: tujuan redirect setelah login & saat akses ditolak.
export const ROLE_HOME: Record<UserRole, string> = {
  owner: "/kasir",
  manager: "/kasir",
  kasir: "/kasir",
  waiter: "/kasir",
  dapur: "/dapur",
};

/** Apakah `role` boleh membuka `pathname`? Cocokkan per segmen route. */
export function canAccess(role: UserRole, pathname: string): boolean {
  return ROLE_ROUTES[role].some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
}
