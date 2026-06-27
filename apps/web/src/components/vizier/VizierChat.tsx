"use client";

import { useRef, useState } from "react";
import { Button } from "@rajask/ui";

interface Turn {
  role: "user" | "assistant";
  content: string;
}

export function VizierChat() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const convId = useRef<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  async function send() {
    const message = draft.trim();
    if (!message || busy) return;
    setDraft("");
    setTurns((t) => [...t, { role: "user", content: message }]);
    setBusy(true);
    try {
      const res = await fetch("/api/vizier/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, conversationId: convId.current }),
      });
      const json = (await res.json()) as { conversationId?: string; reply?: string; error?: string };
      if (json.conversationId) convId.current = json.conversationId;
      setTurns((t) => [...t, { role: "assistant", content: json.reply ?? json.error ?? "(no reply)" }]);
    } catch {
      setTurns((t) => [...t, { role: "assistant", content: "VIZIER is unreachable right now." }]);
    } finally {
      setBusy(false);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }

  return (
    <div className="flex h-[calc(100vh-200px)] flex-col rounded-regal border border-white/8 bg-obsidian-100">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {turns.length === 0 && (
          <div className="grid h-full place-items-center text-center">
            <div>
              <p className="text-sm text-ivory/50">Ask your chief of staff anything about the realm.</p>
              <p className="mt-1 text-[11px] text-ivory/30">
                e.g. &ldquo;What needs me today?&rdquo; · &ldquo;Summarise open risks&rdquo;
              </p>
            </div>
          </div>
        )}
        {turns.map((t, i) => (
          <div key={i} className={`flex ${t.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-xl whitespace-pre-wrap rounded-regal px-3 py-2 text-sm ${t.role === "user" ? "bg-gold/15 text-ivory" : "bg-white/5 text-ivory/90"}`}>
              {t.content}
            </div>
          </div>
        ))}
        {busy && <div className="text-[11px] text-ivory/40">VIZIER is thinking…</div>}
        <div ref={endRef} />
      </div>
      <div className="flex items-end gap-2 border-t border-white/8 p-3">
        <textarea
          className="max-h-32 min-h-[42px] flex-1 resize-none rounded-regal border border-white/10 bg-obsidian px-3 py-2 text-sm text-ivory outline-none placeholder:text-ivory/25 focus:border-gold/50"
          placeholder="Ask VIZIER…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
          rows={1}
        />
        <Button onClick={() => void send()} disabled={busy || !draft.trim()}>Send</Button>
      </div>
    </div>
  );
}
