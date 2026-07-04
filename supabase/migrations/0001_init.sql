-- =====================================================================
-- Kasir Cafe (POS) — Skema awal database
-- Mengacu pada dokumen rancangan bagian 8 (skema utama) dan 10.4 (self-order QR).
-- Jalankan lewat Supabase SQL Editor atau `supabase db push`.
-- =====================================================================

create extension if not exists "pgcrypto"; -- untuk gen_random_uuid()

-- ---------- ENUM ----------
do $$ begin
  create type user_role as enum ('owner', 'manager', 'kasir', 'waiter', 'dapur');
exception when duplicate_object then null; end $$;

do $$ begin
  create type table_status as enum ('tersedia', 'terisi', 'reserved');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_status as enum ('draft', 'dikirim', 'diproses', 'siap', 'selesai', 'void');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_method as enum ('tunai', 'qris', 'kartu', 'ewallet');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum ('pending', 'lunas', 'gagal', 'refund');
exception when duplicate_object then null; end $$;

do $$ begin
  create type qr_session_status as enum ('aktif', 'ditutup', 'kadaluarsa');
exception when duplicate_object then null; end $$;

-- ---------- outlets ----------
create table if not exists outlets (
  id            uuid primary key default gen_random_uuid(),
  nama          text not null,
  alamat        text,
  pajak_persen  numeric(5,2) not null default 0,      -- mis. 10.00
  service_charge_persen numeric(5,2) not null default 0,
  dibuat_pada   timestamptz not null default now()
);

-- ---------- users (staf) ----------
-- Login staf memakai PIN 4 digit; simpan hash-nya (jangan plaintext).
create table if not exists users (
  id          uuid primary key default gen_random_uuid(),
  outlet_id   uuid not null references outlets(id) on delete cascade,
  nama        text not null,
  role        user_role not null default 'kasir',
  pin_hash    text not null,
  is_active   boolean not null default true,
  dibuat_pada timestamptz not null default now()
);
create index if not exists idx_users_outlet on users(outlet_id);

-- ---------- tables (meja) ----------
create table if not exists tables (
  id          uuid primary key default gen_random_uuid(),
  outlet_id   uuid not null references outlets(id) on delete cascade,
  nama_meja   text not null,                          -- mis. "A4"
  status      table_status not null default 'tersedia',
  kapasitas   int not null default 4,
  dibuat_pada timestamptz not null default now(),
  unique (outlet_id, nama_meja)
);
create index if not exists idx_tables_outlet on tables(outlet_id);

-- ---------- categories ----------
create table if not exists categories (
  id          uuid primary key default gen_random_uuid(),
  outlet_id   uuid not null references outlets(id) on delete cascade,
  nama        text not null,
  urutan      int not null default 0,
  dibuat_pada timestamptz not null default now()
);
create index if not exists idx_categories_outlet on categories(outlet_id);

-- ---------- menu_items ----------
create table if not exists menu_items (
  id            uuid primary key default gen_random_uuid(),
  category_id   uuid not null references categories(id) on delete cascade,
  nama          text not null,
  harga         numeric(12,2) not null default 0,
  foto_url      text,
  stok          int,                                  -- null = tidak dilacak
  is_available  boolean not null default true,
  dibuat_pada   timestamptz not null default now()
);
create index if not exists idx_menu_items_category on menu_items(category_id);

-- ---------- item_variants ----------
create table if not exists item_variants (
  id             uuid primary key default gen_random_uuid(),
  menu_item_id   uuid not null references menu_items(id) on delete cascade,
  nama_varian    text not null,                       -- mis. "Large", "Extra pedas"
  harga_tambahan numeric(12,2) not null default 0
);
create index if not exists idx_item_variants_menu on item_variants(menu_item_id);

-- ---------- qr_sessions (self-order per meja) ----------
-- Satu sesi meja menampung banyak checkout (running tab) sampai dibayar.
create table if not exists qr_sessions (
  id             uuid primary key default gen_random_uuid(),
  table_id       uuid not null references tables(id) on delete cascade,
  session_token  text not null unique,
  status         qr_session_status not null default 'aktif',
  dibuat_pada    timestamptz not null default now(),
  kadaluarsa_pada timestamptz
);
create index if not exists idx_qr_sessions_table on qr_sessions(table_id);

-- ---------- orders ----------
-- Terhubung ke qr_session bila berasal dari self-order (dok. 10.4),
-- atau langsung ke meja untuk order yang dibuat kasir/waiter.
create table if not exists orders (
  id             uuid primary key default gen_random_uuid(),
  outlet_id      uuid not null references outlets(id) on delete cascade,
  table_id       uuid references tables(id) on delete set null,
  qr_session_id  uuid references qr_sessions(id) on delete set null,
  staff_id       uuid references users(id) on delete set null,  -- null = self-order pelanggan
  status         order_status not null default 'draft',
  catatan        text,
  dibuat_pada    timestamptz not null default now(),
  ditutup_pada   timestamptz
);
create index if not exists idx_orders_outlet on orders(outlet_id);
create index if not exists idx_orders_table on orders(table_id);
create index if not exists idx_orders_session on orders(qr_session_id);

-- ---------- order_items ----------
create table if not exists order_items (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references orders(id) on delete cascade,
  menu_item_id   uuid not null references menu_items(id) on delete restrict,
  variant_id     uuid references item_variants(id) on delete set null,
  qty            int not null default 1 check (qty > 0),
  catatan        text,
  harga_saat_itu numeric(12,2) not null              -- snapshot harga saat pesan
);
create index if not exists idx_order_items_order on order_items(order_id);

-- ---------- payments ----------
create table if not exists payments (
  id                uuid primary key default gen_random_uuid(),
  order_id          uuid not null references orders(id) on delete cascade,
  metode            payment_method not null,
  jumlah            numeric(12,2) not null,
  status            payment_status not null default 'pending',
  referensi_gateway text,                             -- id transaksi Midtrans/Xendit
  dibuat_pada       timestamptz not null default now()
);
create index if not exists idx_payments_order on payments(order_id);

-- ---------- shifts ----------
create table if not exists shifts (
  id              uuid primary key default gen_random_uuid(),
  staff_id        uuid not null references users(id) on delete cascade,
  mulai           timestamptz not null default now(),
  selesai         timestamptz,
  total_penjualan numeric(12,2) not null default 0
);
create index if not exists idx_shifts_staff on shifts(staff_id);
