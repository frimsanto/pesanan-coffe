"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { SESSION_COOKIE, type SessionUser } from "@/lib/session";

import { ROLE_HOME } from "@/lib/access";

type LoginResult = { ok: true; home: string } | { ok: false };

/** Verifikasi PIN ke Supabase (bandingkan hash) lalu simpan sesi di cookie. */
export async function loginWithPin(pin: string): Promise<LoginResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("login_with_pin", { p_pin: pin });

  if (error || !data || data.length === 0) {
    return { ok: false };
  }

  const user = data[0] as SessionUser;
  const store = await cookies();
  store.set(SESSION_COOKIE, JSON.stringify(user), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12, // 12 jam (satu shift)
  });

  return { ok: true, home: ROLE_HOME[user.role] ?? "/kasir" };
}

export async function logout() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}
