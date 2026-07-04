import { cookies } from "next/headers";

import { SESSION_COOKIE, type SessionUser } from "@/lib/session";

/** Baca sesi staf dari cookie (server-only). */
export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}
