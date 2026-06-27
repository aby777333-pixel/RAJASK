"use client";

import { useState, useTransition } from "react";
import { sendBroadcast } from "@/lib/herald";

export function SendBroadcastButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState<string | null>(null);

  return (
    <button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await sendBroadcast(id);
          setDone(res.ok ? `sent to ${res.sentTo}` : res.error ?? "failed");
        })
      }
      className="rounded-md bg-gold px-2 py-0.5 text-[11px] font-semibold text-obsidian disabled:opacity-50"
      title={done ?? "Proclaim"}
    >
      {pending ? "Sending…" : done ?? "Proclaim"}
    </button>
  );
}
