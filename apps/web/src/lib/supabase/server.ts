import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { Database } from "@rajask/db";
import { env } from "../env";

/**
 * Request-scoped, RLS-bound Supabase client for Server Components / actions.
 * Carries the user's session cookie, so every query is governed by RLS and
 * the permission resolver — never use the service-role client here.
 */
export function createClient() {
  const cookieStore = cookies();
  return createServerClient<Database>(env.supabaseUrl(), env.supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component — middleware refreshes the session.
        }
      },
    },
  });
}
