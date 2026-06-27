import Link from "next/link";
import { SUBSYSTEMS, type Subsystem } from "@rajask/core";
import { subsystemHex, SUBSYSTEM_LABEL } from "@rajask/ui";

/** Subsystems that have a live route today (the rest are upcoming). */
const ROUTES: Partial<Record<Subsystem, string>> = {
  THRONE: "/throne",
  COURT: "/throne/court",
  COURIER: "/throne/courier",
  HERALD: "/throne/herald",
  ALMANAC: "/throne/almanac",
  WRIT: "/throne/writ",
  SEAL: "/throne/seal",
  COUNCIL: "/throne/council",
  VAULT: "/throne/vault",
  EDICT: "/throne/edict",
};

/** Order the Regalia roughly by the spec's phase grouping for the rail. */
const NAV_ORDER: Subsystem[] = [
  "THRONE",
  "VIZIER",
  "REALM",
  "COURT",
  "COURIER",
  "COUNCIL",
  "HERALD",
  "WRIT",
  "SEAL",
  "EDICT",
  "ALMANAC",
  "VAULT",
  "CHANCERY",
  "CHRONICLE",
  "CODEX",
  "TREASURY",
  "PRIVY",
  "CONDUIT",
  "WARD",
];

// Defensive: include any subsystem not explicitly ordered.
const ORDERED = [...NAV_ORDER, ...SUBSYSTEMS.filter((s) => !NAV_ORDER.includes(s))];

export function RegaliaNav() {
  return (
    <nav aria-label="Regalia" className="flex flex-col gap-0.5">
      {ORDERED.map((s) => {
        const meta = SUBSYSTEM_LABEL[s];
        const href = ROUTES[s];
        const dot = (
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: subsystemHex(s) }}
            aria-hidden
          />
        );
        if (href) {
          return (
            <Link
              key={s}
              href={href}
              className="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-ivory/75 transition-colors hover:bg-white/5 hover:text-ivory"
            >
              {dot}
              <span className="truncate">{meta.name}</span>
            </Link>
          );
        }
        return (
          <div
            key={s}
            title="Coming in a later phase"
            className="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-ivory/35"
          >
            {dot}
            <span className="truncate">{meta.name}</span>
            <span className="ml-auto text-[9px] uppercase tracking-wider text-ivory/20">soon</span>
          </div>
        );
      })}
    </nav>
  );
}
