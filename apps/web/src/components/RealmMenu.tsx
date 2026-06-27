"use client";

import { useState } from "react";
import { Badge } from "@rajask/ui";
import { setActiveRealm } from "@/lib/court/actions";
import type { RealmMembership } from "@/lib/court/data";

export function RealmMenu({
  email,
  memberships,
  activeRealmId,
}: {
  email: string;
  memberships: RealmMembership[];
  activeRealmId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const active = memberships.find((m) => m.realmId === activeRealmId) ?? memberships[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-white/10 px-2.5 py-1.5 text-left text-xs hover:bg-white/5"
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-white/8 text-[11px] font-semibold text-ivory">
          {(email[0] ?? "R").toUpperCase()}
        </span>
        <span className="hidden sm:block">
          <span className="block max-w-[140px] truncate text-ivory">
            {active?.realmName ?? "No realm"}
          </span>
          <span className="block text-[10px] text-ivory/40">{active?.titleName ?? ""}</span>
        </span>
        <span className="text-ivory/40">▾</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 z-50 mt-2 w-64 rounded-regal border border-white/10 bg-obsidian-50 p-2 shadow-throne">
            <div className="px-2 py-1.5 text-[11px] text-ivory/40">{email}</div>

            {memberships.length > 0 && (
              <div className="my-1 border-t border-white/8 pt-1">
                <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-ivory/30">
                  Realms
                </div>
                {memberships.map((m) => (
                  <form key={m.realmId} action={setActiveRealm.bind(null, m.realmId)}>
                    <button
                      type="submit"
                      className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-white/5 ${
                        m.realmId === activeRealmId ? "text-gold" : "text-ivory/80"
                      }`}
                    >
                      <span className="truncate">{m.realmName}</span>
                      {m.isSovereign && <Badge tone="gold">Sovereign</Badge>}
                    </button>
                  </form>
                ))}
              </div>
            )}

            <div className="my-1 border-t border-white/8 pt-1">
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="w-full rounded-md px-2 py-1.5 text-left text-sm text-ivory/70 hover:bg-white/5"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
