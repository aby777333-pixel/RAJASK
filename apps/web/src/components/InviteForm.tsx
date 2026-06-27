"use client";

import { useState, useTransition } from "react";
import { Button } from "@rajask/ui";
import { createInvitation } from "@/lib/court/manage";

export function InviteForm({ titles }: { titles: { id: string; name: string }[] }) {
  const [titleId, setTitleId] = useState(titles[0]?.id ?? "");
  const [email, setEmail] = useState("");
  const [channel, setChannel] = useState<"email" | "sms" | "whatsapp" | "link">("email");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    startTransition(async () => {
      const res = await createInvitation({ titleId, email, channel, note });
      if (res.ok) {
        setMsg({ ok: true, text: "Invitation created." });
        setEmail("");
        setNote("");
      } else {
        setMsg({ ok: false, text: res.error ?? "Failed" });
      }
    });
  }

  const input =
    "w-full rounded-lg border border-white/10 bg-obsidian px-3 py-2 text-sm text-ivory outline-none placeholder:text-ivory/25 focus:border-gold/50";

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs text-ivory/50">Title</span>
          <select className={input} value={titleId} onChange={(e) => setTitleId(e.target.value)}>
            {titles.map((t) => (
              <option key={t.id} value={t.id} className="bg-obsidian">
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-ivory/50">Channel</span>
          <select
            className={input}
            value={channel}
            onChange={(e) => setChannel(e.target.value as typeof channel)}
          >
            <option value="email" className="bg-obsidian">Email</option>
            <option value="whatsapp" className="bg-obsidian">WhatsApp</option>
            <option value="sms" className="bg-obsidian">SMS</option>
            <option value="link" className="bg-obsidian">Shareable link</option>
          </select>
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-xs text-ivory/50">Email / phone</span>
        <input
          className={input}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="person@company.com"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-ivory/50">Personal note (optional)</span>
        <input
          className={input}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Join my court as…"
        />
      </label>
      {msg && (
        <p className={`text-sm ${msg.ok ? "text-spectrum-teal" : "text-spectrum-crimson"}`}>
          {msg.text}
        </p>
      )}
      <Button type="submit" disabled={pending || !titleId}>
        {pending ? "Sending…" : "Send invitation"}
      </Button>
    </form>
  );
}
