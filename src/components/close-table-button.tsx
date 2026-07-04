"use client";

import * as React from "react";
import { CheckCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { freeTable } from "@/app/(app)/meja/actions";

/** Tombol "Tutup Meja" — mengosongkan meja & menutup sesi (client action). */
export function CloseTableButton({ tableId }: { tableId: string }) {
  const [pending, startTransition] = React.useTransition();

  function handle() {
    if (!confirm("Kosongkan meja ini? Sesi berjalan akan ditutup.")) return;
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
