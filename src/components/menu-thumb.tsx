import { Coffee, UtensilsCrossed } from "lucide-react";

import { cn } from "@/lib/utils";
import type { JenisKategori } from "@/lib/db-types";

/**
 * Thumbnail item menu: foto asli bila ada, atau ikon placeholder sesuai jenis
 * (cangkir untuk minuman, piring/alat makan untuk makanan) — tidak pernah
 * menampilkan broken image.
 */
export function MenuThumb({
  fotoUrl,
  jenis,
  nama,
  className,
  iconClassName,
}: {
  fotoUrl: string | null;
  jenis: JenisKategori;
  nama: string;
  className?: string;
  iconClassName?: string;
}) {
  if (fotoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={fotoUrl}
        alt={nama}
        className={cn("object-cover", className)}
      />
    );
  }

  const Icon = jenis === "minuman" ? Coffee : UtensilsCrossed;
  return (
    <div
      className={cn(
        "flex items-center justify-center bg-muted text-muted-foreground",
        className
      )}
    >
      <Icon className={cn("h-1/2 w-1/2", iconClassName)} />
    </div>
  );
}
