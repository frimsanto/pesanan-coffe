"use client";

import * as React from "react";
import QRCode from "qrcode";
import { QrCode, Download, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Tombol + dialog QR self-order per meja. QR mengarah ke /order/<nama_meja>
 * (route self-order pelanggan). QR digenerate di client, tanpa layanan luar.
 */
export function TableQr({ namaMeja }: { namaMeja: string }) {
  const [open, setOpen] = React.useState(false);
  const [dataUrl, setDataUrl] = React.useState<string>("");
  const [orderUrl, setOrderUrl] = React.useState<string>("");

  React.useEffect(() => {
    if (!open) return;
    const url = `${window.location.origin}/order/${encodeURIComponent(namaMeja)}`;
    let cancelled = false;
    QRCode.toDataURL(url, { width: 320, margin: 2 })
      .then((d) => {
        if (cancelled) return;
        setDataUrl(d);
        setOrderUrl(url);
      })
      .catch(() => {
        if (!cancelled) setDataUrl("");
      });
    return () => {
      cancelled = true;
    };
  }, [open, namaMeja]);

  function download() {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `qr-meja-${namaMeja}.png`;
    a.click();
  }

  function print() {
    if (!dataUrl) return;
    const w = window.open("", "_blank", "width=420,height=560");
    if (!w) return;
    w.document.write(`
      <html>
        <head><title>QR Meja ${namaMeja}</title></head>
        <body style="margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif">
          <h1 style="font-size:40px;margin:0 0 8px">Meja ${namaMeja}</h1>
          <p style="margin:0 0 16px;color:#555">Scan untuk memesan</p>
          <img src="${dataUrl}" width="320" height="320" alt="QR Meja ${namaMeja}" />
        </body>
      </html>
    `);
    w.document.close();
    w.focus();
    w.onload = () => w.print();
    // Fallback bila onload tidak terpicu (gambar data URL biasanya instan).
    setTimeout(() => w.print(), 300);
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => setOpen(true)}
      >
        <QrCode className="h-4 w-4" /> QR
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>QR Meja {namaMeja}</DialogTitle>
            <DialogDescription>
              Pelanggan scan QR ini untuk memesan sendiri dari meja.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-3 py-2">
            {dataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={dataUrl}
                alt={`QR Meja ${namaMeja}`}
                className="h-64 w-64 rounded-lg border border-border bg-white p-2"
              />
            ) : (
              <div className="flex h-64 w-64 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
                Membuat QR…
              </div>
            )}
            <p className="break-all text-center text-xs text-muted-foreground">
              {orderUrl}
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={download} disabled={!dataUrl}>
              <Download className="h-4 w-4" /> Unduh
            </Button>
            <Button onClick={print} disabled={!dataUrl}>
              <Printer className="h-4 w-4" /> Cetak
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
