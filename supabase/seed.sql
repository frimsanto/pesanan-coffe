-- =====================================================================
-- Seed data contoh — Kasir Cafe "Kopi Senja"
-- Jalankan SETELAH 0001_init.sql, 0002_orders_workflow.sql, dan 0003_menu_photos.sql.
-- Aman dijalankan ulang (idempoten via on conflict / where not exists).
--
-- PIN staf (4 digit, di-hash bcrypt lewat pgcrypto crypt/gen_salt('bf')):
--   Kasir  — Sinta  -> 1111
--   Dapur  — Bagas  -> 2222
--   Owner  — Rendra -> 3333
-- =====================================================================

-- pgcrypto (crypt, gen_salt) di Supabase ada di schema `extensions`.
set search_path = public, extensions;

-- ---------- Outlet ----------
insert into outlets (id, nama, alamat, pajak_persen, service_charge_persen)
values (
  '00000000-0000-0000-0000-000000000001',
  'Kopi Senja',
  'Jl. Merdeka No. 7, Yogyakarta',
  10.00,
  0
)
on conflict (id) do nothing;

-- ---------- Staf (PIN di-hash) ----------
insert into users (outlet_id, nama, role, pin_hash)
select '00000000-0000-0000-0000-000000000001', v.nama, v.role::user_role,
       crypt(v.pin, gen_salt('bf'))
from (values
  ('Sinta',  'kasir', '1111'),
  ('Bagas',  'dapur', '2222'),
  ('Rendra', 'owner', '3333')
) as v(nama, role, pin)
where not exists (
  select 1 from users u
  where u.outlet_id = '00000000-0000-0000-0000-000000000001'
    and u.nama = v.nama
);

-- ---------- Kategori ----------
-- `jenis` membedakan minuman vs makanan (untuk ikon placeholder foto menu).
insert into categories (id, outlet_id, nama, urutan, jenis)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Kopi',     1, 'minuman'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Non-Kopi', 2, 'minuman'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Makanan',  3, 'makanan'),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Snack',    4, 'makanan')
on conflict (id) do nothing;

-- ---------- Menu ----------
insert into menu_items (id, category_id, nama, harga, is_available)
values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Espresso',       18000, true),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Cappuccino',     28000, true),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Caffe Latte',    30000, true),
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'Americano',      22000, false),
  ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000002', 'Matcha Latte',   32000, true),
  ('20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000002', 'Coklat Panas',   28000, true),
  ('20000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000002', 'Lemon Tea',      20000, true),
  ('20000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000003', 'Nasi Goreng',    35000, true),
  ('20000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000003', 'Mie Ayam',       30000, true),
  ('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000004', 'Kentang Goreng', 25000, true),
  ('20000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-000000000004', 'Roti Bakar',     22000, true),
  ('20000000-0000-0000-0000-00000000000c', '10000000-0000-0000-0000-000000000004', 'Croissant',      26000, true)
on conflict (id) do nothing;

-- ---------- Meja ----------
insert into tables (outlet_id, nama_meja, status, kapasitas)
select '00000000-0000-0000-0000-000000000001', v.nama_meja, v.status::table_status, v.kapasitas
from (values
  ('A1', 'tersedia', 2),
  ('A2', 'terisi',   4),
  ('A3', 'tersedia', 4),
  ('A4', 'terisi',   2),
  ('B1', 'reserved', 6),
  ('B2', 'tersedia', 6),
  ('B3', 'terisi',   4),
  ('B4', 'tersedia', 2)
) as v(nama_meja, status, kapasitas)
where not exists (
  select 1 from tables t
  where t.outlet_id = '00000000-0000-0000-0000-000000000001'
    and t.nama_meja = v.nama_meja
);
