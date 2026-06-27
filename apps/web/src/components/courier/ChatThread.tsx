"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Button } from "@rajask/ui";
import { createClient } from "@/lib/supabase/client";
import { markConversationRead } from "@/lib/courier/actions";
import type { ChatMessage } from "@/lib/courier/data";

interface Props {
  conversationId: string;
  realmId: string;
  meId: string;
  meName: string;
  memberNames: Record<string, string>;
  initial: ChatMessage[];
}

interface PresenceMeta {
  userId: string;
  name: string;
  typing: boolean;
}

export function ChatThread({ conversationId, realmId, meId, meName, memberNames, initial }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState<ChatMessage[]>(initial);
  const [draft, setDraft] = useState("");
  const [online, setOnline] = useState<PresenceMeta[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const nameFor = useCallback(
    (id: string | null) => (id ? (id === meId ? meName : memberNames[id] ?? "Member") : "System"),
    [meId, meName, memberNames],
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    void markConversationRead(conversationId);

    const channel = supabase
      .channel(`conv:${conversationId}`, { config: { presence: { key: meId } } })
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const m = payload.new as Record<string, unknown>;
          setMessages((cur) => {
            if (cur.some((x) => x.id === m.id)) return cur;
            return [
              ...cur,
              {
                id: m.id as string,
                body: (m.body as string) ?? null,
                kind: (m.kind as string) ?? "text",
                senderId: (m.sender_user_id as string) ?? null,
                senderName: nameFor((m.sender_user_id as string) ?? null),
                createdAt: m.created_at as string,
                editedAt: (m.edited_at as string) ?? null,
                recalledAt: (m.recalled_at as string) ?? null,
                replyToId: (m.reply_to_id as string) ?? null,
              },
            ];
          });
          void markConversationRead(conversationId);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const m = payload.new as Record<string, unknown>;
          setMessages((cur) =>
            cur.map((x) =>
              x.id === (m.id as string)
                ? { ...x, body: (m.body as string) ?? null, editedAt: (m.edited_at as string) ?? null, recalledAt: (m.recalled_at as string) ?? null }
                : x,
            ),
          );
        },
      )
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceMeta>();
        const flat: PresenceMeta[] = Object.values(state).flat();
        setOnline(flat);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ userId: meId, name: meName, typing: false });
        }
      });

    channelRef.current = channel;
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, meId, meName, supabase, nameFor]);

  function signalTyping() {
    const ch = channelRef.current;
    if (!ch) return;
    void ch.track({ userId: meId, name: meName, typing: true });
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      void ch.track({ userId: meId, name: meName, typing: false });
    }, 2500);
  }

  async function send() {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    const { error } = await supabase.from("messages").insert({
      realm_id: realmId,
      conversation_id: conversationId,
      sender_user_id: meId,
      kind: "text",
      body: text,
    });
    if (error) {
      setDraft(text); // restore on failure
    }
  }

  async function saveEdit(id: string) {
    const text = editText.trim();
    if (!text) return;
    await supabase
      .from("messages")
      .update({ body: text, edited_at: new Date().toISOString() })
      .eq("id", id);
    setEditing(null);
    setEditText("");
  }

  async function recall(id: string) {
    await supabase
      .from("messages")
      .update({ recalled_at: new Date().toISOString(), body: null })
      .eq("id", id);
  }

  const typingOthers = online.filter((p) => p.userId !== meId && p.typing).map((p) => p.name);
  const onlineCount = new Set(online.map((p) => p.userId)).size;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-white/8 px-1 pb-2 text-[11px] text-ivory/40">
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-spectrum-green" /> {onlineCount} online
        </span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto py-3">
        {messages.map((m) => {
          const mine = m.senderId === meId;
          return (
            <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
              <div className="mb-0.5 flex items-center gap-2 text-[11px] text-ivory/40">
                <span>{m.senderName}</span>
                <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                {m.editedAt && !m.recalledAt && <span className="italic">edited</span>}
              </div>
              {editing === m.id ? (
                <div className="flex w-full max-w-md items-center gap-2">
                  <input
                    className="flex-1 rounded-lg border border-white/10 bg-obsidian px-3 py-1.5 text-sm text-ivory outline-none focus:border-gold/50"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveEdit(m.id)}
                  />
                  <button className="text-xs text-gold" onClick={() => saveEdit(m.id)}>Save</button>
                  <button className="text-xs text-ivory/40" onClick={() => setEditing(null)}>Cancel</button>
                </div>
              ) : (
                <div
                  className={`max-w-md rounded-regal px-3 py-2 text-sm ${
                    mine ? "bg-gold/15 text-ivory" : "bg-white/5 text-ivory/90"
                  }`}
                >
                  {m.recalledAt ? (
                    <span className="italic text-ivory/30">message recalled</span>
                  ) : (
                    <span className="whitespace-pre-wrap break-words">{m.body}</span>
                  )}
                </div>
              )}
              {mine && !m.recalledAt && editing !== m.id && (
                <div className="mt-0.5 flex gap-2 text-[10px] text-ivory/30">
                  <button onClick={() => { setEditing(m.id); setEditText(m.body ?? ""); }}>edit</button>
                  <button onClick={() => recall(m.id)}>recall</button>
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="h-4 text-[11px] text-ivory/40">
        {typingOthers.length > 0 && `${typingOthers.join(", ")} ${typingOthers.length === 1 ? "is" : "are"} typing…`}
      </div>

      <div className="flex items-end gap-2 border-t border-white/8 pt-3">
        <textarea
          className="max-h-32 min-h-[42px] flex-1 resize-none rounded-regal border border-white/10 bg-obsidian px-3 py-2 text-sm text-ivory outline-none placeholder:text-ivory/25 focus:border-gold/50"
          placeholder="Write a message…"
          value={draft}
          onChange={(e) => { setDraft(e.target.value); signalTyping(); }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          rows={1}
        />
        <Button onClick={() => void send()} disabled={!draft.trim()}>Send</Button>
      </div>
    </div>
  );
}
