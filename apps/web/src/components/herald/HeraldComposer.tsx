"use client";

import { useState, useTransition } from "react";
import { Button } from "@rajask/ui";
import { createBroadcast } from "@/lib/herald";

export function HeraldComposer({ titles }: { titles: { key: string | null; name: string }[] }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [segment, setSegment] = useState("all");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const input =
    "w-full rounded-lg border border-white/10 bg-obsidian px-3 py-2 text-sm text-ivory outline-none placeholder:text-ivory/25 focus:border-gold/50";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    startTransition(async () => {
      const res = await createBroadcast({
        title,
        body,
        segmentKind: segment === "all" ? "all" : "title",
        segmentValue: segment === "all" ? undefined : segment,
      });
      if (res.ok) {
        setMsg({ ok: true, text: "Proclamation drafted." });
        setTitle("");
        setBody("");
      } else {
        setMsg({ ok: false, text: res.error ?? "Failed" });
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <input className={input} placeholder="Proclamation title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea className={`${input} min-h-[90px]`} placeholder="Address the realm…" value={body} onChange={(e) => setBody(e.target.value)} />
      <label className="block">
        <span className="mb-1 block text-xs text-ivory/50">Audience</span>
        <select className={input} value={segment} onChange={(e) => setSegment(e.target.value)}>
          <option value="all" className="bg-obsidian">Everyone</option>
          {titles
            .filter((t) => t.key)
            .map((t) => (
              <option key={t.key} value={t.key as string} className="bg-obsidian">
                Title: {t.name}
              </option>
            ))}
        </select>
      </label>
      {msg && <p className={`text-sm ${msg.ok ? "text-spectrum-teal" : "text-spectrum-crimson"}`}>{msg.text}</p>}
      <Button type="submit" disabled={pending}>{pending ? "Drafting…" : "Draft proclamation"}</Button>
    </form>
  );
}
