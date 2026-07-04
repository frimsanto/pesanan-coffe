import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client untuk Client Components (browser).
 * Dipakai untuk realtime, self-order, dan interaksi UI kasir.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
