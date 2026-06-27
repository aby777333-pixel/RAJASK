"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCourtContext } from "@/lib/court/data";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function createEvent(input: {
  title: string;
  startsAt: string;
  endsAt?: string;
  location?: string;
  kind: "meeting" | "personal" | "travel" | "board" | "company";
  visibility: "private" | "realm" | "company";
}): Promise<ActionResult> {
  const { user, activeRealm } = await getCourtContext();
  if (!user || !activeRealm) return { ok: false, error: "No active realm." };
  if (input.title.trim().length < 2) return { ok: false, error: "Give the event a title." };
  if (!input.startsAt) return { ok: false, error: "Pick a start time." };

  const supabase = createClient();
  const { error } = await supabase.from("calendar_events").insert({
    realm_id: activeRealm.realmId,
    owner_user_id: user.id,
    title: input.title.trim(),
    starts_at: new Date(input.startsAt).toISOString(),
    ends_at: input.endsAt ? new Date(input.endsAt).toISOString() : null,
    location: input.location?.trim() || null,
    kind: input.kind,
    visibility: input.visibility,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/throne/almanac");
  return { ok: true };
}
