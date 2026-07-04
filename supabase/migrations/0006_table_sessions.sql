-- =====================================================================
-- 0006 — Status meja berbasis sesi (terisi/kosong otomatis + idle)
-- Jalankan setelah 0005_payment_methods.sql.
--
-- Model:
--   • Meja jadi 'terisi' otomatis saat ada order pertama (touch_table).
--   • Staff mengosongkan meja manual lewat 'Tutup Meja' (free_table).
--   • Kolom waktu dipakai untuk indikator "lama terisi" & "perlu dicek".
-- =====================================================================

-- Kapan meja mulai terisi (sesi dibuka) & kapan aktivitas order terakhir.
alter table tables add column if not exists terisi_sejak timestamptz;
alter table tables add column if not exists aktivitas_terakhir timestamptz;

-- Status meja di seed sebelumnya statis/dekoratif — reset ke kondisi nyata
-- (kosong) supaya papan meja mulai dari keadaan bersih.
update tables
   set status = 'tersedia', terisi_sejak = null, aktivitas_terakhir = null;

-- ---------- touch_table: tandai meja terisi + catat aktivitas ----------
-- Dipanggil saat order dibuat. terisi_sejak hanya di-set sekali per sesi
-- (coalesce), aktivitas_terakhir selalu diperbarui.
create or replace function touch_table(p_table_id uuid)
returns void
language sql
as $$
  update tables
     set status = 'terisi',
         aktivitas_terakhir = now(),
         terisi_sejak = coalesce(terisi_sejak, now())
   where id = p_table_id;
$$;

-- ---------- free_table: kosongkan meja & tutup sesi aktif ----------
create or replace function free_table(p_table_id uuid)
returns void
language plpgsql
as $$
begin
  update qr_sessions
     set status = 'ditutup'
   where table_id = p_table_id and status = 'aktif';

  update tables
     set status = 'tersedia',
         terisi_sejak = null,
         aktivitas_terakhir = null
   where id = p_table_id;
end;
$$;

grant execute on function touch_table(uuid) to anon, authenticated;
grant execute on function free_table(uuid) to anon, authenticated;
