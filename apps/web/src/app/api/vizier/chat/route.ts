import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCourtContext } from "@/lib/court/data";

/**
 * VIZIER — the Claude-powered chief of staff. Answers are GROUNDED in a live
 * snapshot of the caller's realm (read under their session/RLS), so VIZIER
 * never fabricates figures. Degrades to a clear message when no key is set.
 */
export async function POST(request: NextRequest) {
  const { user, activeRealm } = await getCourtContext();
  if (!user || !activeRealm) {
    return NextResponse.json({ error: "No active realm" }, { status: 400 });
  }

  const { message, conversationId } = (await request.json().catch(() => ({}))) as {
    message?: string;
    conversationId?: string;
  };
  if (!message || message.trim().length === 0) {
    return NextResponse.json({ error: "Empty message" }, { status: 400 });
  }

  const supabase = createClient();

  // Ensure a conversation (RLS: owner-only).
  let convId = conversationId;
  if (!convId) {
    const { data, error } = await supabase
      .from("vizier_conversations")
      .insert({ realm_id: activeRealm.realmId, user_id: user.id, title: message.slice(0, 60) })
      .select("id")
      .single();
    if (error || !data) return NextResponse.json({ error: error?.message ?? "init failed" }, { status: 500 });
    convId = data.id;
  }

  await supabase.from("vizier_messages").insert({
    realm_id: activeRealm.realmId,
    conversation_id: convId,
    user_id: user.id,
    role: "user",
    content: message,
  });

  // Grounding snapshot (RLS-scoped to what this user may see).
  const realm = activeRealm.realmId;
  const [members, tasks, approvals, risks, meetings] = await Promise.all([
    supabase.from("memberships").select("id", { count: "exact", head: true }).eq("realm_id", realm).eq("status", "active").is("deleted_at", null),
    supabase.from("tasks").select("id", { count: "exact", head: true }).eq("realm_id", realm).is("deleted_at", null).not("status", "in", "(completed,cancelled)"),
    supabase.from("approval_requests").select("id", { count: "exact", head: true }).eq("realm_id", realm).eq("status", "pending"),
    supabase.from("risks").select("id", { count: "exact", head: true }).eq("realm_id", realm).neq("status", "closed").is("deleted_at", null),
    supabase.from("meetings").select("title, starts_at").eq("realm_id", realm).gte("starts_at", new Date().toISOString()).order("starts_at").limit(3),
  ]);

  const snapshot = [
    `Realm: ${activeRealm.realmName}`,
    `Your title: ${activeRealm.titleName}${activeRealm.isSovereign ? " (Sovereign)" : ""}`,
    `Active members: ${members.count ?? 0}`,
    `Open tasks: ${tasks.count ?? 0}`,
    `Pending approvals: ${approvals.count ?? 0}`,
    `Open risks: ${risks.count ?? 0}`,
    `Next meetings: ${(meetings.data ?? []).map((m) => `${m.title} (${new Date(m.starts_at).toLocaleString()})`).join("; ") || "none"}`,
  ].join("\n");

  const apiKey = process.env.ANTHROPIC_API_KEY;
  let reply: string;

  if (!apiKey) {
    reply =
      "VIZIER is not yet connected to Claude (set ANTHROPIC_API_KEY). Here is your live realm snapshot:\n\n" +
      snapshot;
  } else {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1024,
          system:
            "You are VIZIER, the AI chief of staff inside RAJASK, a CEO operating system. " +
            "Be concise, executive, and decisive. Ground every claim in the realm snapshot provided; " +
            "never invent figures. If asked for data you don't have, say so and suggest where in RAJASK to find it.\n\n" +
            "Current realm snapshot:\n" +
            snapshot,
          messages: [{ role: "user", content: message }],
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        reply = `VIZIER could not reach Claude (${res.status}). Snapshot:\n\n${snapshot}\n\n${txt.slice(0, 200)}`;
      } else {
        const json = (await res.json()) as { content?: { type: string; text?: string }[] };
        reply = json.content?.map((c) => c.text ?? "").join("").trim() || "(no response)";
      }
    } catch (e) {
      reply = `VIZIER error: ${e instanceof Error ? e.message : "unknown"}. Snapshot:\n\n${snapshot}`;
    }
  }

  await supabase.from("vizier_messages").insert({
    realm_id: activeRealm.realmId,
    conversation_id: convId,
    user_id: user.id,
    role: "assistant",
    content: reply,
  });

  return NextResponse.json({ conversationId: convId, reply });
}
