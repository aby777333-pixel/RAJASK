import { SUBSYSTEMS, type Subsystem } from "@rajask/core";
import { subsystemHex, SUBSYSTEM_LABEL } from "@rajask/ui";

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
        const active = s === "THRONE";
        return (
          <div
            key={s}
            className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
              active ? "bg-white/5 text-ivory" : "text-ivory/55 hover:bg-white/[0.03] hover:text-ivory/90"
            }`}
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: subsystemHex(s) }}
              aria-hidden
            />
            <span className="truncate">{meta.name}</span>
            {active && (
              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-gold" aria-hidden />
            )}
          </div>
        );
      })}
    </nav>
  );
}
