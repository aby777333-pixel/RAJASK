"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCourtContext } from "./data";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

/** Invite someone into the court with a given title (gated by COURT:admin via RLS). */
export async function createInvitation(form: {
  titleId: string;
  email: string;
  channel: "email" | "sms" | "whatsapp" | "link";
  note?: string;
}): Promise<ActionResult> {
  const { user, activeRealm } = await getCourtContext();
  if (!user || !activeRealm) return { ok: false, error: "No active realm." };
  if (!form.titleId) return { ok: false, error: "Choose a title." };

  const supabase = createClient();
  const { error } = await supabase.from("invitations").insert({
    realm_id: activeRealm.realmId,
    title_id: form.titleId,
    scope: "realm",
    email: form.email || null,
    channel: form.channel,
    note: form.note || null,
    invited_by: user.id,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/throne/court");
  return { ok: true };
}

/** Revoke a pending invitation. Void return so it can be used as a form action. */
export async function revokeInvitation(invitationId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("invitations")
    .update({ status: "revoked" })
    .eq("id", invitationId);
  if (error) throw new Error(error.message);
  revalidatePath("/throne/court");
}

/** Toggle a single permission-matrix cell for a title (gated by COURT:configure via RLS). */
export async function setTitlePermission(
  titleId: string,
  subsystem: string,
  action: string,
  allowed: boolean,
): Promise<ActionResult> {
  const { activeRealm } = await getCourtContext();
  if (!activeRealm) return { ok: false, error: "No active realm." };

  const supabase = createClient();
  const { error } = await supabase
    .from("title_permissions")
    .upsert(
      {
        realm_id: activeRealm.realmId,
        title_id: titleId,
        subsystem,
        action,
        allowed,
      },
      { onConflict: "title_id,subsystem,action" },
    );
  if (error) return { ok: false, error: error.message };
  revalidatePath("/throne/court/titles");
  return { ok: true };
}

/** Suspend / restore / archive a member (gated by COURT:admin via RLS). */
export async function setMemberStatus(
  membershipId: string,
  status: "active" | "suspended" | "archived",
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("memberships")
    .update({ status })
    .eq("id", membershipId);
  if (error) throw new Error(error.message);
  revalidatePath("/throne/court");
}
