"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCourtContext } from "@/lib/court/data";

export interface ActionResult {
  ok: boolean;
  error?: string;
  sentTo?: number;
}

/** Create a draft broadcast targeting a segment. */
export async function createBroadcast(input: {
  title: string;
  body: string;
  segmentKind: "all" | "title";
  segmentValue?: string;
}): Promise<ActionResult> {
  const { user, activeRealm } = await getCourtContext();
  if (!user || !activeRealm) return { ok: false, error: "No active realm." };
  if (input.title.trim().length < 2) return { ok: false, error: "Give it a title." };

  const supabase = createClient();
  const { error } = await supabase.from("broadcasts").insert({
    realm_id: activeRealm.realmId,
    created_by: user.id,
    title: input.title.trim(),
    body: input.body.trim() || null,
    segment:
      input.segmentKind === "title" && input.segmentValue
        ? { kind: "title", value: input.segmentValue }
        : { kind: "all" },
    channels: ["in_app"],
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/throne/herald");
  return { ok: true };
}

/** Proclaim: fan the broadcast out to its segment. */
export async function sendBroadcast(broadcastId: string): Promise<ActionResult> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("rajask_send_broadcast", {
    p_broadcast: broadcastId,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/throne/herald");
  return { ok: true, sentTo: typeof data === "number" ? data : 0 };
}
