import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { SESSION_COOKIE, type SessionUser } from "@/lib/session";
import { canAccess, ROLE_HOME } from "@/lib/access";

// Route staf yang butuh login. /order (self-order pelanggan) & /login publik.
// Selain login, akses juga dibatasi per peran (RBAC) — lihat lib/access.ts.
export function proxy(request: NextRequest) {
  const raw = request.cookies.get(SESSION_COOKIE)?.value;

  // Belum login -> ke halaman login.
  if (!raw) return redirectTo(request, "/login");

  let user: SessionUser;
  try {
    user = JSON.parse(raw) as SessionUser;
  } catch {
    // Cookie rusak: paksa login ulang.
    const res = redirectTo(request, "/login");
    res.cookies.delete(SESSION_COOKIE);
    return res;
  }

  // Peran tidak dikenal/tak lengkap -> login ulang.
  if (!user?.role || !ROLE_HOME[user.role]) {
    return redirectTo(request, "/login");
  }

  // Bukan haknya -> lempar ke halaman utama peran tersebut (bukan sekadar
  // menyembunyikan link; benar-benar diblok di level route).
  if (!canAccess(user.role, request.nextUrl.pathname)) {
    return redirectTo(request, ROLE_HOME[user.role]);
  }

  return NextResponse.next();
}

function redirectTo(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/kasir/:path*",
    "/meja/:path*",
    "/dapur/:path*",
    "/menu/:path*",
    "/laporan/:path*",
    "/riwayat/:path*",
  ],
};
