"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@rajask/db";

/** Browser Supabase client (RLS-bound to the signed-in user). */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
