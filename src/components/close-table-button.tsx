"use client";

import * as React from "react";
import { CheckCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { freeTable } from "@/app/(app)/meja/actions";

/**
 * Jalur pintas untuk kasus paling umum: pelanggan sudah bayar dan pergi.
 * Terpisah dari dropdown "Ubah status" (yang tetap dipertahankan sebagai
 * override manual untuk kasus lain, mis. reserved). Menutup qr_session
 * aktif; status meja otomatis balik 'tersedia' lewat free_table (RPC).
 */
export function CloseTableButton({
  tableId,
  namaMeja,
}: {
  tableId: string;
  namaMeja: string;
}) {
  const [pending, startTransition] = React.useTransition();

  function handle() {
    if (
      !confirm(`Tutup sesi Meja ${namaMeja}? Pastikan pembayaran sudah selesai.`)
    ) {
      return;
    }
    startTransition(async () => {
      const res = await freeTable(tableId);
      if (!res.ok) alert(res.message ?? "Gagal menutup meja.");
    });
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className="w-full"
      disabled={pending}
      onClick={handle}
    >
      <CheckCheck className="h-4 w-4" />
      {pending ? "Menutup…" : "Tutup Meja"}
    </Button>
  );
}
