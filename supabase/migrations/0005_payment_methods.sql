-- =====================================================================
-- 0005 — Metode bayar tambahan: transfer bank
-- Jalankan setelah 0004_rls_policies.sql.
-- =====================================================================
-- Enum payment_method awalnya: tunai, qris, kartu, ewallet.
-- Tambah 'transfer' untuk pembayaran transfer bank (self-order di meja).
alter type payment_method add value if not exists 'transfer';
