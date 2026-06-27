"use client";

import { useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { startDm, createChannel } from "@/lib/courier/actions";
import type { ConversationSummary, RealmPerson } from "@/lib/courier/data";

export function CourierSidebar({
  conversations,
  people,
}: {
  conversations: ConversationSummary[];
  people: RealmPerson[];
}) {
  const pathname = usePathname();
  const [showNew, setShowNew] = useState(false);
  const [channelName, setChannelName] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between pb-2">
        <h2 className="font-display text-lg text-ivory">Courier</h2>
        <button
          onClick={() => setShowNew((v) => !v)}
          className="rounded-md border border-white/10 px-2 py-1 text-xs text-ivory/70 hover:bg-white/5"
        >
          {showNew ? "Close" : "New"}
        </button>
      </div>

      {showNew && (
        <div className="mb-3 space-y-3 rounded-regal border border-white/8 bg-obsidian-100 p-3">
          <div>
            <div className="mb-1 text-[10px] uppercase tracking-wider text-ivory/30">Direct message</div>
            <div className="max-h-40 space-y-0.5 overflow-y-auto">
              {people.length === 0 && <p className="text-xs text-ivory/40">No other members yet.</p>}
              {people.map((p) => (
                <form key={p.userId} action={startDm.bind(null, p.userId)}>
                  <button
                    type="submit"
                    className="w-full truncate rounded-md px-2 py-1 text-left text-sm text-ivory/80 hover:bg-white/5"
                  >
                    {p.name}
                  </button>
                </form>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1 text-[10px] uppercase tracking-wider text-ivory/30">New channel</div>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-md border border-white/10 bg-obsidian px-2 py-1 text-sm text-ivory outline-none focus:border-gold/50"
                placeholder="channel-name"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
              />
              <button
                disabled={pending || channelName.trim().length < 2}
                onClick={() =>
                  startTransition(async () => {
                    await createChannel(channelName);
                    setChannelName("");
                    setShowNew(false);
                  })
                }
                className="rounded-md bg-gold px-2 py-1 text-xs font-semibold text-obsidian disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 space-y-0.5 overflow-y-auto">
        {conversations.length === 0 && (
          <p className="px-2 py-4 text-sm text-ivory/40">
            No conversations yet. Hit <span className="text-ivory/70">New</span> to start one.
          </p>
        )}
        {conversations.map((c) => {
          const active = pathname === `/throne/courier/${c.id}`;
          return (
            <Link
              key={c.id}
              href={`/throne/courier/${c.id}`}
              className={`flex items-center justify-between rounded-md px-2 py-2 text-sm ${
                active ? "bg-white/5 text-ivory" : "text-ivory/70 hover:bg-white/[0.03]"
              }`}
            >
              <span className="flex items-center gap-2 truncate">
                <span className="text-ivory/30">{c.kind === "dm" ? "@" : "#"}</span>
                <span className="truncate">{c.title}</span>
              </span>
              {c.unread && <span className="h-2 w-2 shrink-0 rounded-full bg-gold" />}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
