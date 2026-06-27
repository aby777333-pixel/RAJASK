"use client";

import { useState, useTransition } from "react";
import { SUBSYSTEMS, ACTIONS, type Subsystem, type Action } from "@rajask/core";
import { subsystemHex } from "@rajask/ui";
import { setTitlePermission } from "@/lib/court/manage";

export function TitleMatrix({
  titleId,
  initial,
  editable,
}: {
  titleId: string;
  /** Set of "SUBSYSTEM:action" strings currently allowed. */
  initial: string[];
  editable: boolean;
}) {
  const [allowed, setAllowed] = useState<Set<string>>(new Set(initial));
  const [, startTransition] = useTransition();

  function toggle(s: Subsystem, a: Action) {
    if (!editable) return;
    const key = `${s}:${a}`;
    const next = new Set(allowed);
    const willAllow = !next.has(key);
    if (willAllow) next.add(key);
    else next.delete(key);
    setAllowed(next);
    startTransition(async () => {
      const res = await setTitlePermission(titleId, s, a, willAllow);
      if (!res.ok) {
        // revert on failure
        setAllowed((cur) => {
          const r = new Set(cur);
          if (willAllow) r.delete(key);
          else r.add(key);
          return r;
        });
      }
    });
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 bg-obsidian-100 p-2 text-left text-xs font-medium text-ivory/50">
              Subsystem
            </th>
            {ACTIONS.map((a) => (
              <th key={a} className="p-2 text-center text-[11px] font-medium text-ivory/50">
                {a}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SUBSYSTEMS.map((s) => (
            <tr key={s} className="border-t border-white/5">
              <td className="sticky left-0 bg-obsidian-100 p-2">
                <span className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: subsystemHex(s) }}
                  />
                  <span className="text-ivory/80">{s}</span>
                </span>
              </td>
              {ACTIONS.map((a) => {
                const on = allowed.has(`${s}:${a}`);
                return (
                  <td key={a} className="p-1 text-center">
                    <button
                      type="button"
                      onClick={() => toggle(s, a)}
                      disabled={!editable}
                      aria-pressed={on}
                      title={`${s}:${a}`}
                      className={`h-5 w-5 rounded border transition-colors ${
                        on
                          ? "border-gold/40 bg-gold/80"
                          : "border-white/10 bg-transparent hover:bg-white/5"
                      } ${editable ? "cursor-pointer" : "cursor-default opacity-70"}`}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
