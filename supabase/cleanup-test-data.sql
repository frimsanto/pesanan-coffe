-- =====================================================================
-- cleanup-test-data.sql — SCRIPT MANUAL SEKALI JALAN, BUKAN MIGRATION.
--
-- Jangan taruh di supabase/migrations/ dan jangan dijalankan otomatis lewat
-- pipeline migrasi. Jalankan sendiri lewat Supabase SQL Editor, sekali saja,
-- untuk membersihkan sisa tiket testing yang nyangkut di papan /dapur.
--
-- Yang dilakukan: order berstatus 'siap' yang sudah dibuat > 1 jam lalu
-- (berarti tiket testing lama yang tidak pernah ditutup, bukan tiket
-- aktif yang baru saja siap disajikan) diubah jadi 'selesai' supaya hilang
-- dari papan aktif /dapur. Order tetap tersimpan & tetap terlihat di
-- /riwayat (yang difilter berdasarkan status pembayaran, bukan status order).
-- =====================================================================

update orders
   set status = 'selesai',
       ditutup_pada = coalesce(ditutup_pada, now())
 where status = 'siap'
   and dibuat_pada < now() - interval '1 hour';
