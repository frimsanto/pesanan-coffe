-- =====================================================================
-- 0007 — Status meja otomatis mengikuti aktivitas order + realtime
-- Jalankan setelah 0006_table_sessions.sql.
--
-- Model:
--   • touch_table (0006) sudah menandai meja 'terisi' saat order pertama.
--   • Di sini: begitu SEMUA order pada suatu meja lunas/void (tidak ada
--     lagi yang menggantung), meja otomatis kembali 'tersedia' dan sesi
--     QR aktif ditutup — tanpa aksi manual staf.
--   • Override manual staf dihormati: meja ber-status 'reserved' TIDAK
--     ikut dikosongkan otomatis (hanya 'terisi' yang di-reset).
--   • Papan /meja realtime: tabel tables ikut publikasi realtime.
-- =====================================================================

-- ---------- settle_table: kosongkan meja bila tak ada order menggantung ----------
-- "Menggantung" = order yang belum void DAN belum punya payment lunas.
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
    and o.status <> 'void'
    and not exists (
      select 1 from payments p
       where p.order_id = o.id and p.status = 'lunas'
    );

  if v_open = 0 then
    -- Tutup sesi QR aktif untuk meja ini.
    update qr_sessions
       set status = 'ditutup'
     where table_id = p_table_id and status = 'aktif';

    -- Kosongkan meja HANYA bila sedang 'terisi' (jangan timpa 'reserved'
    -- yang diset staf secara manual).
    update tables
       set status = 'tersedia',
           terisi_sejak = null,
           aktivitas_terakhir = null
     where id = p_table_id and status = 'terisi';
  end if;
end;
$$;

-- ---------- Trigger: pembayaran lunas -> coba kosongkan meja ----------
create or replace function trg_settle_from_payment()
returns trigger
language plpgsql
as $$
declare
  v_table uuid;
begin
  select table_id into v_table from orders where id = new.order_id;
  perform settle_table(v_table);
  return new;
end;
$$;

drop trigger if exists settle_on_payment on payments;
create trigger settle_on_payment
after insert or update of status on payments
for each row
when (new.status = 'lunas')
execute function trg_settle_from_payment();

-- ---------- Trigger: order dibatalkan (void) -> coba kosongkan meja ----------
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
create trigger settle_on_order_void
after update of status on orders
for each row
when (new.status = 'void' and old.status is distinct from 'void')
execute function trg_settle_from_order();

grant execute on function settle_table(uuid) to anon, authenticated;

-- ---------- Realtime untuk papan /meja ----------
do $$ begin
  alter publication supabase_realtime add table tables;
exception when duplicate_object then null; end $$;

-- Payload UPDATE menyertakan kolom lama (dipakai filter/animasi bila perlu).
alter table tables replica identity full;
