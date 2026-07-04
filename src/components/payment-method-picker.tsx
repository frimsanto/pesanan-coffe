"use client";

import { QrCode, Wallet, Landmark, Banknote } from "lucide-react";

import { formatRupiah } from "@/lib/utils";
import {
  PAYMENT_CHANNELS,
  PAYMENT_GROUP_LABEL,
  type PaymentChannel,
  type PaymentGroup,
} from "@/lib/payment";
import { Button } from "@/components/ui/button";

const GROUP_ICON: Record<PaymentGroup, typeof QrCode> = {
  qris: QrCode,
  ewallet: Wallet,
  transfer: Landmark,
  tunai: Banknote,
};

const GROUPS: PaymentGroup[] = ["qris", "ewallet", "transfer", "tunai"];

/** Pemilih metode bayar berkelompok — dipakai di self-order & kasir. */
export function PaymentMethodPicker({
  total,
  onPick,
  disabled,
}: {
  total: number;
  onPick: (ch: PaymentChannel) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between border-b border-border pb-3 text-base font-bold">
        <span>Total</span>
        <span className="tabular text-primary">{formatRupiah(total)}</span>
      </div>
      {GROUPS.map((g) => {
        const items = PAYMENT_CHANNELS.filter((c) => c.group === g);
        const Icon = GROUP_ICON[g];
        return (
          <div key={g}>
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Icon className="h-4 w-4" /> {PAYMENT_GROUP_LABEL[g]}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {items.map((c) => (
                <Button
                  key={c.id}
                  variant="outline"
                  className="justify-start"
                  disabled={disabled}
                  onClick={() => onPick(c)}
                >
                  {c.label}
                </Button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
