// Status order di database (enum order_status) & pemetaannya ke UI.

export type OrderStatus =
  | "draft"
  | "menunggu_konfirmasi"
  | "diterima"
  | "dikirim"
  | "diproses"
  | "siap"
  | "selesai"
  | "void";

/** Tahap yang ditampilkan di Kitchen Display (3 kolom warna). */
export type KitchenStage = "baru" | "proses" | "siap";

/** Status DB yang dianggap "aktif" di dapur. */
export const KITCHEN_STATUSES: OrderStatus[] = [
  "dikirim",
  "diterima",
  "diproses",
  "siap",
];

export function kitchenStage(status: OrderStatus): KitchenStage | null {
  if (status === "dikirim" || status === "diterima") return "baru";
  if (status === "diproses") return "proses";
  if (status === "siap") return "siap";
  return null;
}

/** Status DB berikutnya saat tombol dapur ditekan (maju satu tahap). */
export function nextKitchenStatus(status: OrderStatus): OrderStatus | null {
  if (status === "dikirim" || status === "diterima") return "diproses";
  if (status === "diproses") return "siap";
  return null; // 'siap' sudah tahap akhir dapur
}

export const STAGE_LABEL: Record<KitchenStage, string> = {
  baru: "Baru masuk",
  proses: "Sedang diproses",
  siap: "Siap disajikan",
};

/** Label status yang dilihat pelanggan di /order. */
export const CUSTOMER_STATUS_LABEL: Record<OrderStatus, string> = {
  draft: "Draft",
  menunggu_konfirmasi: "Menunggu konfirmasi",
  diterima: "Diterima",
  dikirim: "Diterima",
  diproses: "Sedang diproses",
  siap: "Siap disajikan",
  selesai: "Selesai",
  void: "Dibatalkan",
};
