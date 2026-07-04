"use client";

import * as React from "react";

import type { TableRow } from "@/lib/db-types";
import { setTableStatus } from "@/app/(app)/meja/actions";

const OPTIONS: { value: TableRow["status"]; label: string }[] = [
  { value: "tersedia", label: "Kosong" },
  { value: "terisi", label: "Terisi" },
  { value: "reserved", label: "Reserved" },
];

/**
 * Override manual status meja oleh staf. Perubahan otomatis (order masuk /
 * lunas) tetap jalan sebagai default; kontrol ini memberi staf kendali penuh.
 */
export function TableStatusSelect({
  tableId,
  status,
}: {
  tableId: string;
  status: TableRow["status"];
}) {
  const [pending, startTransition] = React.useTransition();

  function change(next: TableRow["status"]) {
    if (next === status) return;
    if (next === "tersedia" && status === "terisi") {
      if (!confirm("Kosongkan meja ini? Sesi berjalan akan ditutup.")) return;
    }
    startTransition(async () => {
      const res = await setTableStatus(tableId, next);
      if (!res.ok) alert(res.message ?? "Gagal mengubah status meja.");
    });
  }

  return (
    <label className="mt-1 block">
      <span className="eyebrow mb-1 block text-muted-foreground">Ubah status</span>
      <select
        aria-label="Ubah status meja"
        value={status}
        disabled={pending}
        onChange={(e) => change(e.target.value as TableRow["status"])}
        className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm disabled:opacity-50"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
