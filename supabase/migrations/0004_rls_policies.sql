-- =====================================================================
-- 0004 — RLS policies untuk role anon/authenticated
-- Jalankan setelah 0003_menu_photos.sql.
--
-- Kenapa perlu: aplikasi ini TIDAK memakai Supabase Auth. Login staf lewat
-- cookie custom (lihat login_with_pin), dan SEMUA baca/tulis data dilakukan
-- dengan anon key. Kalau RLS aktif pada tabel data tanpa policy, PostgREST
-- mengembalikan array kosong -> menu, meja, order tampak kosong di aplikasi.
--
-- Model keamanan: tabel `users` tetap TERTUTUP (hanya login_with_pin yang
-- SECURITY DEFINER boleh membacanya). Tabel data lain dibuka untuk anon
-- karena aplikasi adalah satu-satunya klien.
-- =====================================================================

-- Helper: aktifkan RLS + policy permissif (anon + authenticated) satu tabel.
do $$
declare
  t text;
  tables_list text[] := array[
    'outlets', 'tables', 'categories', 'menu_items', 'item_variants',
    'qr_sessions', 'orders', 'order_items', 'payments', 'shifts'
  ];
begin
  foreach t in array tables_list loop
    execute format('alter table %I enable row level security', t);
    -- Hapus policy lama (kalau ada) supaya idempoten, lalu buat ulang.
    execute format('drop policy if exists "%s_anon_all" on %I', t, t);
    execute format(
      'create policy "%s_anon_all" on %I for all to anon, authenticated using (true) with check (true)',
      t, t
    );
  end loop;
end $$;

-- Catatan: `users` sengaja TIDAK disertakan di atas — tetap tanpa policy
-- (tertutup dari anon), sesuai desain di 0002_orders_workflow.sql.
