"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_REALM_COOKIE } from "./data";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const suffix = crypto.randomUUID().slice(0, 6);
  return `${base || "realm"}-${suffix}`;
}

function setActiveRealmCookie(realmId: string) {
  cookies().set(ACTIVE_REALM_COOKIE, realmId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

/** Establish a new realm; the caller becomes its Sovereign (§4). */
export async function createRealm(name: string): Promise<ActionResult> {
  const trimmed = name.trim();
  if (trimmed.length < 2) return { ok: false, error: "Give your realm a name." };

  const supabase = createClient();
  const { data, error } = await supabase.rpc("rajask_create_realm", {
    p_name: trimmed,
    p_slug: slugify(trimmed),
  });
  if (error) return { ok: false, error: error.message };

  if (typeof data === "string") setActiveRealmCookie(data);
  revalidatePath("/throne");
  redirect("/throne");
}

/** Switch the active realm (one-click company/realm switching, §5.3). */
export async function setActiveRealm(realmId: string): Promise<void> {
  setActiveRealmCookie(realmId);
  revalidatePath("/throne", "layout");
}

/**
 * Accept a court invitation and land in the new realm. Void return so it can be
 * used directly as a form action; throws on failure to surface the error.
 */
export async function acceptInvitation(token: string): Promise<void> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("rajask_accept_invitation", {
    p_token: token,
  });
  if (error) throw new Error(error.message);
  if (typeof data === "string") setActiveRealmCookie(data);
  revalidatePath("/throne");
  redirect("/throne");
}
