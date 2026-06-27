"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCourtContext } from "@/lib/court/data";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

async function ctx() {
  return getCourtContext();
}

async function sha256Hex(value: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ---- REALM ----
export async function createCompany(input: { name: string; kind: string; currency: string }): Promise<ActionResult> {
  const { activeRealm } = await ctx();
  if (!activeRealm) return { ok: false, error: "No active realm." };
  if (input.name.trim().length < 2) return { ok: false, error: "Name the company." };
  const supabase = createClient();
  const { error } = await supabase.from("companies").insert({
    realm_id: activeRealm.realmId,
    name: input.name.trim(),
    kind: input.kind,
    currency: input.currency || "INR",
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/throne/realm");
  return { ok: true };
}

export async function createOkr(input: { objective: string; keyResult?: string; period?: string }): Promise<ActionResult> {
  const { user, activeRealm } = await ctx();
  if (!user || !activeRealm) return { ok: false, error: "No active realm." };
  if (input.objective.trim().length < 2) return { ok: false, error: "State the objective." };
  const supabase = createClient();
  const { error } = await supabase.from("okrs").insert({
    realm_id: activeRealm.realmId,
    owner_user_id: user.id,
    objective: input.objective.trim(),
    key_result: input.keyResult?.trim() || null,
    period: input.period?.trim() || null,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/throne/realm");
  return { ok: true };
}

// ---- CONDUIT ----
export async function createConnector(input: { provider: string; label?: string }): Promise<ActionResult> {
  const { user, activeRealm } = await ctx();
  if (!user || !activeRealm) return { ok: false, error: "No active realm." };
  const supabase = createClient();
  const { error } = await supabase.from("integration_connectors").insert({
    realm_id: activeRealm.realmId,
    provider: input.provider,
    label: input.label?.trim() || input.provider,
    created_by: user.id,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/throne/conduit");
  return { ok: true };
}

export interface ApiKeyResult extends ActionResult {
  plaintext?: string;
}
/** Generate an API key; the plaintext is returned ONCE, only the hash is stored. */
export async function createApiKey(input: { name: string }): Promise<ApiKeyResult> {
  const { user, activeRealm } = await ctx();
  if (!user || !activeRealm) return { ok: false, error: "No active realm." };
  if (input.name.trim().length < 2) return { ok: false, error: "Name the key." };
  const supabase = createClient();

  const rand = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const plaintext = `rsk_${rand}`;
  const prefix = plaintext.slice(0, 12);
  const hash = await sha256Hex(plaintext);

  const { error } = await supabase.from("api_keys").insert({
    realm_id: activeRealm.realmId,
    name: input.name.trim(),
    key_prefix: prefix,
    key_hash: hash,
    created_by: user.id,
    scopes: ["read"],
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/throne/conduit");
  return { ok: true, plaintext };
}

export async function revokeApiKey(keyId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("api_keys").update({ revoked_at: new Date().toISOString() }).eq("id", keyId);
  if (error) throw new Error(error.message);
  revalidatePath("/throne/conduit");
}

// ---- PRIVY ----
export async function createPrivyItem(input: { title: string; kind: string; body?: string; dueAt?: string }): Promise<ActionResult> {
  const { user, activeRealm } = await ctx();
  if (!user || !activeRealm) return { ok: false, error: "No active realm." };
  if (input.title.trim().length < 1) return { ok: false, error: "Add a title." };
  const supabase = createClient();
  const { error } = await supabase.from("privy_items").insert({
    realm_id: activeRealm.realmId,
    owner_user_id: user.id,
    kind: input.kind,
    title: input.title.trim(),
    body: input.body?.trim() || null,
    due_at: input.dueAt ? new Date(input.dueAt).toISOString() : null,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/throne/privy");
  return { ok: true };
}
