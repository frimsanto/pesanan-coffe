"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

/**
 * Menyegarkan papan /meja secara realtime tanpa refresh manual.
 * Mendengarkan perubahan pada `tables` (status berubah via touch/settle/override)
 * dan `orders` (tab berjalan / order baru) lalu memicu re-render server component.
 */
export function MejaRealtime() {
  const router = useRouter();

  React.useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("meja-board")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tables" },
        () => router.refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => router.refresh()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
