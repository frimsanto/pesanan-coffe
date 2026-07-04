"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  UtensilsCrossed,
  Table2,
  BarChart3,
  ChefHat,
  History,
  LogOut,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { CAFE_NAMA } from "@/lib/mock-data";
import { ROLE_LABEL, type SessionUser } from "@/lib/session";
import { canAccess } from "@/lib/access";
import { logout } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV = [
  { href: "/kasir", label: "Kasir", icon: LayoutGrid },
  { href: "/meja", label: "Meja", icon: Table2 },
  { href: "/dapur", label: "Dapur", icon: ChefHat },
  { href: "/menu", label: "Menu", icon: UtensilsCrossed },
  { href: "/laporan", label: "Laporan", icon: BarChart3 },
  { href: "/riwayat", label: "Riwayat", icon: History },
];

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: SessionUser;
}) {
  const pathname = usePathname();
  // Sidebar hanya menampilkan menu sesuai hak akses peran yang login.
  const nav = NAV.filter((item) => canAccess(user.role, item.href));

  return (
    <div className="flex min-h-screen w-full">
      {/* Sidebar (desktop) — gradient malam -> senja-ungu, teks terang */}
      <aside className="sidebar-gradient hidden w-60 shrink-0 flex-col border-r border-white/5 text-[#f0e9de] md:flex">
        <div className="flex h-16 items-center gap-2.5 px-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#b8794f]/50 bg-[#b8794f]/15 text-lg">
            ☕
          </span>
          <span
            className="text-xl tracking-tight"
            style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
          >
            {CAFE_NAMA}
          </span>
        </div>

        {/* Penanda peran */}
        <div className="px-3 pb-1">
          <RoleBadge user={user} />
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-3">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                  active
                    ? "bg-[#b8794f]/15 text-[#f0e9de]"
                    : "text-[#f0e9de]/55 hover:bg-white/5 hover:text-[#f0e9de]"
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-[#cf9668]" />
                )}
                <Icon className={cn("h-5 w-5", active && "text-[#cf9668]")} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3">
          <form action={logout}>
            <Button
              type="submit"
              variant="ghost"
              className="w-full justify-start text-[#f0e9de]/55 transition-colors hover:bg-white/5 hover:text-[#f0e9de]"
            >
              <LogOut className="h-5 w-5" />
              Keluar
            </Button>
          </form>
        </div>
      </aside>

      {/* Konten */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between gap-3 border-b border-border px-4 md:px-6">
          <MobileNav pathname={pathname} nav={nav} />
          {/* Penanda peran (mobile) */}
          <div className="md:hidden">
            <RoleBadge user={user} compact />
          </div>
          <div className="hidden flex-1 md:block" />
          <ThemeToggle />
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

function RoleBadge({ user, compact }: { user: SessionUser; compact?: boolean }) {
  // compact = header mobile (tema normal); non-compact = sidebar gelap.
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border",
        compact
          ? "border-border bg-background px-2.5 py-1.5"
          : "w-full border-white/8 bg-white/5 px-3 py-2"
      )}
    >
      <span className="flex h-2 w-2 shrink-0 rounded-full bg-[#cf9668]" />
      <div className="min-w-0 leading-tight">
        <p className={cn("eyebrow truncate", compact && "text-foreground")}>
          {ROLE_LABEL[user.role]}
        </p>
        {!compact && (
          <p className="truncate text-xs text-[#f0e9de]/50">{user.nama}</p>
        )}
      </div>
    </div>
  );
}

function MobileNav({
  pathname,
  nav,
}: {
  pathname: string;
  nav: typeof NAV;
}) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto md:hidden">
      {nav.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "relative flex h-11 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent"
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="sr-only sm:not-sr-only">{label}</span>
            {active && (
              <span className="absolute inset-x-2 bottom-0.5 h-0.5 rounded-full bg-primary" />
            )}
          </Link>
        );
      })}
    </div>
  );
}
