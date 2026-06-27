"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCourtContext } from "@/lib/court/data";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

/** Open (or reuse) a 1:1 DM with another realm member, then go to it. */
export async function startDm(otherUserId: string): Promise<void> {
  const { user, activeRealm } = await getCourtContext();
  if (!user || !activeRealm) redirect("/throne");
  const supabase = createClient();
  const { data, error } = await supabase.rpc("rajask_get_or_create_dm", {
    p_realm: activeRealm.realmId,
    p_other: otherUserId,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/throne/courier");
  redirect(`/throne/courier/${data}`);
}

/** Create a named channel and join it as owner. */
export async function createChannel(name: string): Promise<void> {
  const trimmed = name.trim();
  const { user, activeRealm } = await getCourtContext();
  if (!user || !activeRealm) redirect("/throne");
  if (trimmed.length < 2) throw new Error("Name the channel.");

  const supabase = createClient();
  const { data: conv, error } = await supabase
    .from("conversations")
    .insert({
      realm_id: activeRealm.realmId,
      kind: "channel",
      name: trimmed,
      created_by: user.id,
      last_message_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !conv) throw new Error(error?.message ?? "Could not create channel");

  const { error: memErr } = await supabase.from("conversation_members").insert({
    realm_id: activeRealm.realmId,
    conversation_id: conv.id,
    user_id: user.id,
    role: "owner",
  });
  if (memErr) throw new Error(memErr.message);

  revalidatePath("/throne/courier");
  redirect(`/throne/courier/${conv.id}`);
}

/** Mark a conversation read up to now for the caller. */
export async function markConversationRead(conversationId: string): Promise<ActionResult> {
  const { user } = await getCourtContext();
  if (!user) return { ok: false, error: "Not authenticated" };
  const supabase = createClient();
  const { error } = await supabase
    .from("conversation_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
