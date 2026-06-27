"use client";

import { useState, useTransition } from "react";
import { Button } from "@rajask/ui";
import { createEvent } from "@/lib/almanac";

export function EventComposer() {
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [location, setLocation] = useState("");
  const [kind, setKind] = useState<"meeting" | "personal" | "travel" | "board" | "company">("meeting");
  const [visibility, setVisibility] = useState<"private" | "realm" | "company">("realm");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const input =
    "w-full rounded-lg border border-white/10 bg-obsidian px-3 py-2 text-sm text-ivory outline-none placeholder:text-ivory/25 focus:border-gold/50";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    startTransition(async () => {
      const res = await createEvent({ title, startsAt, endsAt: endsAt || undefined, location, kind, visibility });
      if (res.ok) {
        setMsg({ ok: true, text: "Event added." });
        setTitle("");
        setStartsAt("");
        setEndsAt("");
        setLocation("");
      } else {
        setMsg({ ok: false, text: res.error ?? "Failed" });
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <input className={input} placeholder="Event title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <label className="block">
        <span className="mb-1 block text-xs text-ivory/50">Starts</span>
        <input type="datetime-local" className={input} value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-ivory/50">Ends (optional)</span>
        <input type="datetime-local" className={input} value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
      </label>
      <input className={input} placeholder="Location (optional)" value={location} onChange={(e) => setLocation(e.target.value)} />
      <div className="grid grid-cols-2 gap-2">
        <select className={input} value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
          {["meeting", "personal", "travel", "board", "company"].map((k) => (
            <option key={k} value={k} className="bg-obsidian">{k}</option>
          ))}
        </select>
        <select className={input} value={visibility} onChange={(e) => setVisibility(e.target.value as typeof visibility)}>
          {["realm", "company", "private"].map((v) => (
            <option key={v} value={v} className="bg-obsidian">{v}</option>
          ))}
        </select>
      </div>
      {msg && <p className={`text-sm ${msg.ok ? "text-spectrum-teal" : "text-spectrum-crimson"}`}>{msg.text}</p>}
      <Button type="submit" disabled={pending}>{pending ? "Adding…" : "Add to calendar"}</Button>
    </form>
  );
}
