-- =====================================================================
-- 0002 — Alur order (self-order konfirmasi), login PIN, & Realtime
-- Jalankan setelah 0001_init.sql.
-- =====================================================================

-- ---------- Perluas enum status order ----------
-- Alur:
--   self-order pelanggan  -> 'menunggu_konfirmasi'
--   staf approve          -> 'diterima'          (masuk antrian dapur)
--   order dibuat kasir    -> 'dikirim'           (langsung antrian dapur)
--   dapur                 -> 'diproses' -> 'siap' -> 'selesai'
alter type order_status add value if not exists 'menunggu_konfirmasi';
alter type order_status add value if not exists 'diterima';

-- ---------- Login staf via PIN ----------
-- Bandingkan PIN 4 digit terhadap hash bcrypt (pgcrypto crypt/bf).
-- SECURITY DEFINER supaya tabel users tetap tertutup (RLS) dari anon,
-- fungsi ini satu-satunya jalan verifikasi.
create or replace function login_with_pin(p_pin text)
returns table (id uuid, nama text, role user_role, outlet_id uuid)
language sql
security definer
-- pgcrypto (crypt) di Supabase berada di schema `extensions`, wajib disertakan.
set search_path = public, extensions
as $$
  select u.id, u.nama, u.role, u.outlet_id
  from users u
  where u.is_active
    and u.pin_hash = crypt(p_pin, u.pin_hash)
  limit 1;
$$;

grant execute on function login_with_pin(text) to anon, authenticated;

-- Tutup tabel users dari akses langsung anon (hanya RPC di atas yang boleh baca).
alter table users enable row level security;
-- (Sengaja tanpa policy: anon/authenticated tidak bisa select langsung;
--  fungsi SECURITY DEFINER tetap bisa membaca.)

-- ---------- Realtime ----------
-- Supaya perubahan terlihat langsung di /dapur, /kasir, dan /order.
do $$ begin
  alter publication supabase_realtime add table orders;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table order_items;
exception when duplicate_object then null; end $$;

-- REPLICA IDENTITY FULL agar payload realtime menyertakan kolom lama saat UPDATE.
alter table orders replica identity full;
alter table order_items replica identity full;
