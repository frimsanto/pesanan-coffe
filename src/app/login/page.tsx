"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Delete } from "lucide-react";

import { cn } from "@/lib/utils";
import { loginWithPin } from "./actions";

const PIN_LENGTH = 4;

export default function LoginPage() {
  const router = useRouter();
  const [pin, setPin] = React.useState("");
  const [error, setError] = React.useState(false);
  const submitting = React.useRef(false);

  function press(digit: string) {
    setError(false);
    setPin((prev) => (prev.length < PIN_LENGTH ? prev + digit : prev));
  }

  function backspace() {
    setError(false);
    setPin((prev) => prev.slice(0, -1));
  }

  React.useEffect(() => {
    if (pin.length !== PIN_LENGTH || submitting.current) return;
    submitting.current = true;
    loginWithPin(pin)
      .then((res) => {
        if (res.ok) {
          router.push(res.home);
        } else {
          setError(true);
          setPin("");
        }
      })
      .catch(() => {
        // mis. koneksi Supabase gagal — jangan menggantung.
        setError(true);
        setPin("");
      })
      .finally(() => {
        submitting.current = false;
      });
  }, [pin, router]);

  return (
    <div className="senja-gradient flex min-h-screen flex-col items-center justify-center gap-9 p-6 text-[#f0e9de]">
      <div className="senja-rise flex flex-col items-center gap-3 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#b8794f]/50 bg-[#b8794f]/15 text-3xl shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          ☕
        </div>
        <h1
          className="text-4xl font-semibold tracking-tight"
          style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
        >
          Kopi Senja
        </h1>
        <p className="text-sm text-[#f0e9de]/60">Masukkan PIN 4 digit Anda</p>
      </div>

      {/* Indikator PIN */}
      <div className="senja-rise flex flex-col items-center gap-3" style={{ animationDelay: "80ms" }}>
        <div className="flex gap-4">
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-3.5 w-3.5 rounded-full border-2 border-[#f0e9de]/25 transition-colors",
                i < pin.length && "border-[#cf9668] bg-[#cf9668]",
                error && "border-[#c56547] bg-transparent"
              )}
            />
          ))}
        </div>
        <p
          className={cn(
            "h-5 text-sm font-medium text-[#e0876c] transition-opacity",
            error ? "opacity-100" : "opacity-0"
          )}
        >
          PIN salah, coba lagi.
        </p>
      </div>

      {/* Keypad */}
      <div className="senja-rise grid grid-cols-3 gap-4" style={{ animationDelay: "160ms" }}>
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <KeypadButton key={d} onClick={() => press(d)}>
            {d}
          </KeypadButton>
        ))}
        <div />
        <KeypadButton onClick={() => press("0")}>0</KeypadButton>
        <KeypadButton onClick={backspace} aria-label="Hapus">
          <Delete className="h-6 w-6" />
        </KeypadButton>
      </div>

      <p className="senja-rise max-w-xs text-center text-xs text-[#f0e9de]/45" style={{ animationDelay: "240ms" }}>
        Demo PIN — Kasir: 1111 · Dapur: 2222 · Owner: 3333
      </p>
    </div>
  );
}

function KeypadButton({
  children,
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "keypad-key flex h-16 w-16 items-center justify-center rounded-full text-2xl font-semibold",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#cf9668] focus-visible:ring-offset-2 focus-visible:ring-offset-[#231f20]",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
