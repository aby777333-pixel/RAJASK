import { createClient } from "@/lib/supabase/server";

export interface ConversationSummary {
  id: string;
  kind: string;
  title: string; // channel name or DM peer name
  lastMessageAt: string | null;
  unread: boolean;
}

export interface ChatMessage {
  id: string;
  body: string | null;
  kind: string;
  senderId: string | null;
  senderName: string;
  createdAt: string;
  editedAt: string | null;
  recalledAt: string | null;
  replyToId: string | null;
}

export interface RealmPerson {
  userId: string;
  name: string;
  email: string | null;
}

function displayName(u: { full_name: string | null; email: string | null } | null): string {
  return u?.full_name || u?.email || "Unknown";
}

/** Conversations the caller belongs to in this realm, newest first. */
export async function listConversations(realmId: string, meId: string): Promise<ConversationSummary[]> {
  const supabase = createClient();

  const { data: mine } = await supabase
    .from("conversation_members")
    .select("conversation_id, last_read_at")
    .eq("user_id", meId)
    .eq("realm_id", realmId);

  const ids = (mine ?? []).map((m) => m.conversation_id);
  if (ids.length === 0) return [];
  const lastReadByConv = new Map((mine ?? []).map((m) => [m.conversation_id, m.last_read_at]));

  const [{ data: convs }, { data: members }] = await Promise.all([
    supabase
      .from("conversations")
      .select("id, kind, name, last_message_at")
      .in("id", ids)
      .is("deleted_at", null)
      .order("last_message_at", { ascending: false, nullsFirst: false }),
    supabase
      .from("conversation_members")
      .select("conversation_id, user_id, users(full_name, email)")
      .in("conversation_id", ids),
  ]);

  // peers for DM titles
  const peersByConv = new Map<string, string>();
  for (const m of members ?? []) {
    if (m.user_id !== meId) {
      const u = m.users as unknown as { full_name: string | null; email: string | null } | null;
      peersByConv.set(m.conversation_id, displayName(u));
    }
  }

  return (convs ?? []).map((c) => ({
    id: c.id,
    kind: c.kind,
    title: c.kind === "dm" ? (peersByConv.get(c.id) ?? "Direct message") : (c.name ?? "Channel"),
    lastMessageAt: c.last_message_at,
    unread:
      !!c.last_message_at &&
      (!lastReadByConv.get(c.id) || c.last_message_at > (lastReadByConv.get(c.id) as string)),
  }));
}

export async function getConversationHeader(convId: string, meId: string) {
  const supabase = createClient();
  const [{ data: conv }, { data: members }] = await Promise.all([
    supabase.from("conversations").select("id, kind, name, topic, realm_id").eq("id", convId).single(),
    supabase
      .from("conversation_members")
      .select("user_id, users(full_name, email)")
      .eq("conversation_id", convId),
  ]);
  if (!conv) return null;
  let title = conv.name ?? "Conversation";
  if (conv.kind === "dm") {
    const peer = (members ?? []).find((m) => m.user_id !== meId);
    const u = peer?.users as unknown as { full_name: string | null; email: string | null } | null;
    title = displayName(u);
  }
  const memberList = (members ?? []).map((m) => ({
    userId: m.user_id,
    name: displayName(m.users as unknown as { full_name: string | null; email: string | null } | null),
  }));

  return {
    id: conv.id,
    kind: conv.kind,
    title,
    topic: conv.topic,
    realmId: conv.realm_id,
    memberCount: memberList.length,
    members: memberList,
  };
}

export async function getMessages(convId: string): Promise<ChatMessage[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("messages")
    .select("id, body, kind, sender_user_id, created_at, edited_at, recalled_at, reply_to_id, users(full_name, email)")
    .eq("conversation_id", convId)
    .order("created_at", { ascending: true })
    .limit(100);

  return (data ?? []).map((m) => ({
    id: m.id,
    body: m.body,
    kind: m.kind,
    senderId: m.sender_user_id,
    senderName: displayName(m.users as unknown as { full_name: string | null; email: string | null } | null),
    createdAt: m.created_at,
    editedAt: m.edited_at,
    recalledAt: m.recalled_at,
    replyToId: m.reply_to_id,
  }));
}

/** Distinct people in the realm (for starting a new DM). */
export async function getRealmPeople(realmId: string, meId: string): Promise<RealmPerson[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("memberships")
    .select("user_id, users(full_name, email)")
    .eq("realm_id", realmId)
    .eq("status", "active")
    .is("deleted_at", null);

  const seen = new Set<string>();
  const people: RealmPerson[] = [];
  for (const m of data ?? []) {
    if (m.user_id === meId || seen.has(m.user_id)) continue;
    seen.add(m.user_id);
    const u = m.users as unknown as { full_name: string | null; email: string | null } | null;
    people.push({ userId: m.user_id, name: displayName(u), email: u?.email ?? null });
  }
  return people;
}
