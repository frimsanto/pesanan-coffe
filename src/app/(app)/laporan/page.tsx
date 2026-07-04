import { TrendingUp, Receipt, Coffee, Wallet } from "lucide-react";

import { formatRupiah } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

type RawPaidOrder = {
  id: string;
  dibuat_pada: string;
  order_items: {
    qty: number;
    harga_saat_itu: number;
    menu_items: { nama: string } | null;
  }[];
  payments: { jumlah: number; status: string }[];
};

export default async function LaporanPage() {
  const supabase = await createClient();

  // Awal hari ini (waktu lokal server) untuk filter "hari ini".
  const now = new Date();
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).toISOString();

  // Order berbayar (payment lunas) yang dibuat hari ini.
  const { data } = await supabase
    .from("orders")
    .select(
      "id, dibuat_pada, order_items(qty, harga_saat_itu, menu_items(nama)), payments!inner(jumlah, status)"
    )
    .eq("payments.status", "lunas")
    .gte("dibuat_pada", todayStart);

  const orders = (data ?? []) as unknown as RawPaidOrder[];

  // Agregasi metrik.
  const transaksi = orders.length;
  const omzet = orders.reduce(
    (s, o) => s + (o.payments ?? []).reduce((p, x) => p + Number(x.jumlah), 0),
    0
  );
  const itemTerjual = orders.reduce(
    (s, o) => s + (o.order_items ?? []).reduce((q, it) => q + it.qty, 0),
    0
  );
  const rataRata = transaksi ? Math.round(omzet / transaksi) : 0;

  // Menu terlaris (berdasarkan qty) hari ini.
  const terlarisMap = new Map<string, { qty: number; total: number }>();
  for (const o of orders) {
    for (const it of o.order_items ?? []) {
      const nama = it.menu_items?.nama ?? "Item";
      const cur = terlarisMap.get(nama) ?? { qty: 0, total: 0 };
      cur.qty += it.qty;
      cur.total += Number(it.harga_saat_itu) * it.qty;
      terlarisMap.set(nama, cur);
    }
  }
  const terlaris = [...terlarisMap.entries()]
    .map(([nama, v]) => ({ nama, ...v }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  const stats = [
    { label: "Omzet Hari Ini", value: formatRupiah(omzet), icon: Wallet },
    { label: "Transaksi", value: String(transaksi), icon: Receipt },
    { label: "Rata-rata / Transaksi", value: formatRupiah(rataRata), icon: TrendingUp },
    { label: "Item Terjual", value: String(itemTerjual), icon: Coffee },
  ];

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Laporan Penjualan</h1>
        <p className="text-sm text-muted-foreground">Ringkasan performa hari ini</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="flex flex-col gap-3 p-4">
              <div className="flex items-center justify-between">
                <p className="eyebrow truncate text-muted-foreground">{label}</p>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4.5 w-4.5" />
                </div>
              </div>
              <p
                className="truncate text-3xl font-semibold tracking-tight tabular-nums"
                style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
              >
                {value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Menu Terlaris</CardTitle>
        </CardHeader>
        <CardContent>
          {terlaris.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Belum ada penjualan hari ini.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Menu</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {terlaris.map((row) => (
                  <TableRow key={row.nama}>
                    <TableCell className="font-medium">{row.nama}</TableCell>
                    <TableCell className="tabular text-right">{row.qty}</TableCell>
                    <TableCell className="tabular text-right">
                      {formatRupiah(row.total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
