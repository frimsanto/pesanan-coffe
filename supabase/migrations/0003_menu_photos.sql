-- =====================================================================
-- 0003 — Foto menu (Supabase Storage) & jenis kategori (makanan/minuman)
-- Jalankan setelah 0002_orders_workflow.sql.
-- =====================================================================

-- ---------- Jenis kategori (makanan / minuman) ----------
-- Belum ada pembeda eksplisit makanan vs minuman di skema; kategori yang ada
-- (Kopi, Non-Kopi, Makanan, Snack) tidak menyatakannya secara langsung.
-- Kolom `jenis` dipakai untuk memilih ikon placeholder saat foto kosong
-- (cangkir untuk minuman, piring untuk makanan).
alter table categories
  add column if not exists jenis text not null default 'makanan'
    check (jenis in ('makanan', 'minuman'));

-- Backfill kategori bawaan seed: Kopi & Non-Kopi = minuman.
update categories set jenis = 'minuman'
where nama in ('Kopi', 'Non-Kopi') and jenis <> 'minuman';

-- =====================================================================
-- Storage bucket "menu-photos" (foto menu, publik untuk dibaca)
-- =====================================================================
-- Bucket bisa dibuat lewat SQL. Jika baris ini gagal karena permission,
-- buat manual di Dashboard (lihat catatan di bawah file).
insert into storage.buckets (id, name, public)
values ('menu-photos', 'menu-photos', true)
on conflict (id) do update set public = true;

-- ---------- Policies pada storage.objects ----------
-- `create policy` tidak mendukung IF NOT EXISTS, jadi bungkus DO/exception
-- supaya migration aman dijalankan ulang.

-- Baca publik (foto tampil tanpa auth).
do $$ begin
  create policy "menu-photos read publik"
    on storage.objects for select
    using (bucket_id = 'menu-photos');
exception when duplicate_object then null; end $$;

-- Upload (aplikasi memakai anon key dari browser owner).
do $$ begin
  create policy "menu-photos upload"
    on storage.objects for insert to anon, authenticated
    with check (bucket_id = 'menu-photos');
exception when duplicate_object then null; end $$;

-- Update (mis. overwrite foto lama).
do $$ begin
  create policy "menu-photos update"
    on storage.objects for update to anon, authenticated
    using (bucket_id = 'menu-photos');
exception when duplicate_object then null; end $$;

-- Hapus.
do $$ begin
  create policy "menu-photos delete"
    on storage.objects for delete to anon, authenticated
    using (bucket_id = 'menu-photos');
exception when duplicate_object then null; end $$;
