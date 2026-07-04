-- =====================================================================
-- 0008 — Alur kasir walk-in: nomor antrian + model settle berbasis order
-- Jalankan setelah 0007_table_auto_status.sql.
--
-- Dua hal:
--  1) Kolom `nomor_antrian` + fungsi nomor antrian harian (bawa pulang).
--  2) Ganti model auto-settle meja dari berbasis-PEMBAYARAN menjadi
--     berbasis-LIFECYCLE order. Alasan: order kasir walk-in dibayar di muka
--     (payment lunas) tapi pelanggan dine-in masih duduk -> meja HARUS tetap
--     'terisi'. Jadi meja hanya bebas otomatis saat order-nya selesai/void,
--     bukan saat dibayar. (Alur self-order tidak berubah.)
-- =====================================================================

-- ---------- 1) Nomor antrian (bawa pulang) ----------
alter table orders add column if not exists nomor_antrian int;

-- Nomor antrian sekuensial per outlet, reset tiap hari (zona Asia/Jakarta).
create or replace function next_queue_number(p_outlet uuid)
returns int
language sql
as $$
  select coalesce(max(nomor_antrian), 0) + 1
  from orders
  where outlet_id = p_outlet
    and nomor_antrian is not null
    and (dibuat_pada at time zone 'Asia/Jakarta')::date
        = (now() at time zone 'Asia/Jakarta')::date;
$$;

grant execute on function next_queue_number(uuid) to anon, authenticated;

-- ---------- 2) Settle meja berbasis lifecycle order ----------
-- "Menggantung" = order yang belum selesai/void (mengabaikan status bayar).
create or replace function settle_table(p_table_id uuid)
returns void
language plpgsql
as $$
declare
  v_open int;
begin
  if p_table_id is null then
    return;
  end if;

  select count(*) into v_open
  from orders o
  where o.table_id = p_table_id
    and o.status not in ('selesai', 'void');

  if v_open = 0 then
    update qr_sessions
       set status = 'ditutup'
     where table_id = p_table_id and status = 'aktif';

    update tables
       set status = 'tersedia',
           terisi_sejak = null,
           aktivitas_terakhir = null
     where id = p_table_id and status = 'terisi';
  end if;
end;
$$;

-- Hentikan settle berbasis pembayaran (dari 0007) — sudah tidak dipakai.
drop trigger if exists settle_on_payment on payments;

-- Settle saat order berpindah ke 'selesai' atau 'void'.
create or replace function trg_settle_from_order()
returns trigger
language plpgsql
as $$
begin
  perform settle_table(new.table_id);
  return new;
end;
$$;

drop trigger if exists settle_on_order_void on orders;
drop trigger if exists settle_on_order_done on orders;
create trigger settle_on_order_done
after update of status on orders
for each row
when (new.status in ('selesai', 'void') and old.status is distinct from new.status)
execute function trg_settle_from_order();

-- Realtime papan /meja (aman bila sudah ditambahkan di 0007).
do $$ begin
  alter publication supabase_realtime add table tables;
exception when duplicate_object then null; end $$;
alter table tables replica identity full;
