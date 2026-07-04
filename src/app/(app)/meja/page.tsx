import { Users, Clock, AlertTriangle } from "lucide-react";

import { cn, formatRupiah } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { TableQr } from "@/components/table-qr";
import { MejaRealtime } from "@/components/meja-realtime";
import { TableStatusSelect } from "@/components/table-status-select";

export const dynamic = "force-dynamic";

type Status = "tersedia" | "terisi" | "reserved";

// Meja terisi tanpa order baru selama ini dianggap "perlu dicek".
const IDLE_MENIT = 45;

// Status order yang masih "berjalan" (menempati meja).
const OPEN_STATUS = [
  "menunggu_konfirmasi",
  "diterima",
  "dikirim",
  "diproses",
  "siap",
];

const STATUS_LABEL: Record<Status, string> = {
  tersedia: "Kosong",
  terisi: "Terisi",
  reserved: "Reserved",
};

const STATUS_VARIANT: Record<Status, "success" | "warning" | "outline"> = {
  tersedia: "success",
  terisi: "warning",
  reserved: "outline",
};

type MejaRow = {
  id: string;
  nama_meja: string;
  status: Status;
  kapasitas: number;
  terisi_sejak: string | null;
  aktivitas_terakhir: string | null;
};

type ActiveOrder = {
  table_id: string | null;
  order_items: { qty: number; harga_saat_itu: number }[];
};

function menitSejak(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
}

function formatDurasi(menit: number): string {
  if (menit < 60) return `${menit} mnt`;
  const jam = Math.floor(menit / 60);
  const sisa = menit % 60;
  return sisa ? `${jam} jam ${sisa} mnt` : `${jam} jam`;
}

export default async function MejaPage() {
  const supabase = await createClient();

  const [{ data: tablesData }, { data: ordersData }] = await Promise.all([
    supabase
      .from("tables")
      .select("id, nama_meja, status, kapasitas, terisi_sejak, aktivitas_terakhir")
      .order("nama_meja"),
    supabase
      .from("orders")
      .select("table_id, order_items(qty, harga_saat_itu)")
      .in("status", OPEN_STATUS),
  ]);

  const meja = (tablesData ?? []) as MejaRow[];
  const orders = (ordersData ?? []) as unknown as ActiveOrder[];

  // Agregasi tab berjalan per meja (jumlah order aktif + total).
  const tab = new Map<string, { count: number; total: number }>();
  for (const o of orders) {
    if (!o.table_id) continue;
    const cur = tab.get(o.table_id) ?? { count: 0, total: 0 };
    cur.count += 1;
    cur.total += (o.order_items ?? []).reduce(
      (s, it) => s + Number(it.harga_saat_itu) * it.qty,
      0
    );
    tab.set(o.table_id, cur);
  }

  const jmlTerisi = meja.filter((m) => m.status === "terisi").length;

  return (
    <div className="p-4 md:p-6">
      {/* Segarkan papan otomatis saat status meja / order berubah */}
      <MejaRealtime />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Manajemen Meja</h1>
          <p className="text-sm text-muted-foreground">
            {jmlTerisi} dari {meja.length} meja terisi
          </p>
        </div>
        <div className="flex gap-4 text-sm">
          <Legend color="bg-success" label="Kosong" />
          <Legend color="bg-warning" label="Terisi" />
          <Legend color="bg-destructive" label="Perlu dicek" />
        </div>
      </div>

      {meja.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
          {meja.map((m) => {
            const terisi = m.status === "terisi";
            const info = tab.get(m.id);
            const durasi = menitSejak(m.terisi_sejak);
            const idleMenit = menitSejak(m.aktivitas_terakhir);
            const perluDicek =
              terisi && idleMenit !== null && idleMenit >= IDLE_MENIT;

            return (
              <div
                key={m.id}
                className={cn(
                  "flex flex-col gap-2 rounded-xl border-2 bg-card p-4 text-left transition-colors",
                  perluDicek
                    ? "border-destructive/60"
                    : terisi
                      ? "border-warning/50"
                      : m.status === "reserved"
                        ? "border-border"
                        : "border-success/40"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xl font-bold">{m.nama_meja}</span>
                  <Badge variant={perluDicek ? "destructive" : STATUS_VARIANT[m.status]}>
                    {perluDicek ? "Perlu dicek" : STATUS_LABEL[m.status]}
                  </Badge>
                </div>

                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" /> {m.kapasitas} kursi
                </span>

                {terisi ? (
                  <div className="flex flex-col gap-1 border-t border-border pt-2 text-sm">
                    {durasi !== null && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-4 w-4" /> {formatDurasi(durasi)}
                      </span>
                    )}
                    {info && info.count > 0 && (
                      <span className="text-muted-foreground">
                        {info.count} pesanan ·{" "}
                        <span className="font-semibold text-foreground">
                          {formatRupiah(info.total)}
                        </span>
                      </span>
                    )}
                    {perluDicek && (
                      <span className="flex items-center gap-1 text-xs font-medium text-destructive">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Tak ada order {formatDurasi(idleMenit!)}
                      </span>
                    )}
                  </div>
                ) : (
                  <TableQr namaMeja={m.nama_meja} />
                )}

                <TableStatusSelect tableId={m.id} status={m.status} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-muted-foreground">
      <span className={cn("h-3 w-3 rounded-full", color)} />
      {label}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-2xl">
        🪑
      </div>
      <div>
        <p className="text-lg font-semibold">Belum ada meja</p>
        <p className="text-sm text-muted-foreground">
          Jalankan seed.sql atau tambahkan meja di database.
        </p>
      </div>
    </div>
  );
}
