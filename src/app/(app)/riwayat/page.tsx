import { History } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { formatRupiah } from "@/lib/utils";
import { METODE_LABEL } from "@/lib/payment";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

// Bentuk mentah hasil nested-select Supabase.
type RawRiwayat = {
  id: string;
  dibuat_pada: string;
  ditutup_pada: string | null;
  tables: { nama_meja: string } | null;
  order_items: {
    id: string;
    qty: number;
    harga_saat_itu: number;
    menu_items: { nama: string } | null;
  }[];
  payments: { metode: string; jumlah: number; status: string }[];
};

function formatWaktu(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function RiwayatPage() {
  const supabase = await createClient();

  // Pesanan yang sudah DIBAYAR (punya payment lunas). Read-only, terbaru dulu.
  // payments!inner + filter status=lunas -> hanya order berbayar yang muncul.
  const { data } = await supabase
    .from("orders")
    .select(
      "id, dibuat_pada, ditutup_pada, tables(nama_meja), order_items(id, qty, harga_saat_itu, menu_items(nama)), payments!inner(metode, jumlah, status)"
    )
    .eq("payments.status", "lunas")
    .order("dibuat_pada", { ascending: false });

  const orders = (data ?? []) as unknown as RawRiwayat[];

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Riwayat Pesanan</h1>
        <p className="text-sm text-muted-foreground">
          Pesanan yang sudah dibayar (hanya-lihat)
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <History className="h-8 w-8" />
          </div>
          <div>
            <p className="text-lg font-semibold">Belum ada riwayat</p>
            <p className="text-sm text-muted-foreground">
              Pesanan yang sudah dibayar akan muncul di sini.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Waktu</TableHead>
                <TableHead>Meja</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Metode</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => {
                const subtotal = (o.order_items ?? []).reduce(
                  (s, it) => s + Number(it.harga_saat_itu) * it.qty,
                  0
                );
                const payment = o.payments?.[0];
                const total = payment ? Number(payment.jumlah) : subtotal;
                return (
                  <TableRow key={o.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatWaktu(o.ditutup_pada ?? o.dibuat_pada)}
                    </TableCell>
                    <TableCell>
                      {o.tables?.nama_meja ? (
                        `Meja ${o.tables.nama_meja}`
                      ) : (
                        <span className="text-muted-foreground">Tanpa meja</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <ul className="text-sm text-muted-foreground">
                        {(o.order_items ?? []).map((it) => (
                          <li key={it.id} className="truncate">
                            {it.qty}× {it.menu_items?.nama ?? "Item"}
                          </li>
                        ))}
                      </ul>
                    </TableCell>
                    <TableCell>
                      {payment ? (
                        <Badge variant="outline">
                          {METODE_LABEL[
                            payment.metode as keyof typeof METODE_LABEL
                          ] ?? payment.metode}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="tabular text-right font-semibold">
                      {formatRupiah(total)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
