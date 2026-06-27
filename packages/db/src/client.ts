import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types.gen";

/** A Supabase client typed against the RAJASK schema. */
export type RajaskClient = SupabaseClient<Database>;

/**
 * Service-role client — bypasses RLS. Use ONLY in trusted server contexts
 * (edge functions, webhooks, background jobs). Never ship the service key to
 * the browser. Domain access from this client must still pass the permission
 * resolver in application code.
 */
export function createServiceClient(url: string, serviceRoleKey: string): RajaskClient {
  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Anonymous/authenticated client factory. The caller supplies the publishable
 * (anon) key; RLS governs every row. Framework-specific SSR wiring (cookie
 * handling) lives in the consuming app, not here.
 */
export function createAnonClient(url: string, anonKey: string): RajaskClient {
  return createClient<Database>(url, anonKey);
}
