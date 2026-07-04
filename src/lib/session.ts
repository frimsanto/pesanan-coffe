// Konstanta & tipe sesi yang aman dipakai di client maupun server.
// Fungsi baca cookie (server-only) ada di session-server.ts.

export type UserRole = "owner" | "manager" | "kasir" | "waiter" | "dapur";

export type SessionUser = {
  id: string;
  nama: string;
  role: UserRole;
  outlet_id: string;
};

export const SESSION_COOKIE = "cafe_session";

/** Label peran untuk ditampilkan di badge AppShell. */
export const ROLE_LABEL: Record<UserRole, string> = {
  owner: "Owner",
  manager: "Manajer",
  kasir: "Kasir",
  waiter: "Waiter",
  dapur: "Dapur",
};

