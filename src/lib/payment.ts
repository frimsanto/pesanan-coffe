// Metode pembayaran self-order di meja (mode simulasi, tanpa gateway asli).
// Dipakai bersama oleh UI /order (pelanggan pilih) & server action (validasi).

export type PaymentMethodDb = "tunai" | "qris" | "kartu" | "ewallet" | "transfer";

export type PaymentGroup = "qris" | "ewallet" | "transfer" | "tunai";

export type PaymentChannel = {
  id: string; // kunci unik yang dikirim dari client ke server
  label: string; // nama yang ditampilkan, mis. "GoPay"
  metode: PaymentMethodDb; // dipetakan ke kolom payments.metode
  group: PaymentGroup;
  /**
   * true  = bayar online (disimulasikan lunas seketika, order langsung ke dapur)
   * false = bayar tunai di kasir (payment pending sampai kasir konfirmasi)
   */
  online: boolean;
};

// Daftar channel yang ditawarkan ke pelanggan.
export const PAYMENT_CHANNELS: PaymentChannel[] = [
  { id: "qris", label: "QRIS", metode: "qris", group: "qris", online: true },

  { id: "gopay", label: "GoPay", metode: "ewallet", group: "ewallet", online: true },
  { id: "ovo", label: "OVO", metode: "ewallet", group: "ewallet", online: true },
  { id: "dana", label: "DANA", metode: "ewallet", group: "ewallet", online: true },
  { id: "shopeepay", label: "ShopeePay", metode: "ewallet", group: "ewallet", online: true },

  { id: "bca", label: "Transfer BCA", metode: "transfer", group: "transfer", online: true },
  { id: "bni", label: "Transfer BNI", metode: "transfer", group: "transfer", online: true },
  { id: "mandiri", label: "Transfer Mandiri", metode: "transfer", group: "transfer", online: true },

  { id: "tunai", label: "Tunai di Kasir", metode: "tunai", group: "tunai", online: false },
];

export function getPaymentChannel(id: string): PaymentChannel | undefined {
  return PAYMENT_CHANNELS.find((c) => c.id === id);
}

// Nomor rekening/instruksi simulasi untuk layar pembayaran transfer.
export const REKENING_SIMULASI: Record<string, string> = {
  bca: "1234567890",
  bni: "0987654321",
  mandiri: "1122334455",
};

export const PAYMENT_GROUP_LABEL: Record<PaymentGroup, string> = {
  qris: "QRIS",
  ewallet: "E-Wallet",
  transfer: "Transfer Bank",
  tunai: "Tunai",
};

export const METODE_LABEL: Record<PaymentMethodDb, string> = {
  tunai: "Tunai",
  qris: "QRIS",
  kartu: "Kartu",
  ewallet: "E-Wallet",
  transfer: "Transfer Bank",
};
