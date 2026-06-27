import type { Subsystem } from "@rajask/core";

/**
 * The nine facets of the RAJASK logo, used functionally: each Regalia
 * subsystem is assigned a facet colour so the UI is colour-coded by domain.
 */
export const SPECTRUM = {
  purple: "#92278F",
  magenta: "#EC008C",
  crimson: "#E2231A",
  orange: "#F58220",
  gold: "#FDB913",
  lime: "#8DC63F",
  green: "#009444",
  teal: "#0093D0",
  blue: "#005DAA",
} as const;

export type SpectrumColor = keyof typeof SPECTRUM;

/** Subsystem → facet colour. THRONE is gold (the sovereign seat). */
export const SUBSYSTEM_COLOR: Record<Subsystem, SpectrumColor> = {
  THRONE: "gold",
  VIZIER: "magenta",
  REALM: "blue",
  COURIER: "teal",
  COUNCIL: "purple",
  HERALD: "orange",
  WRIT: "green",
  SEAL: "crimson",
  EDICT: "lime",
  ALMANAC: "teal",
  VAULT: "blue",
  CHANCERY: "orange",
  CHRONICLE: "magenta",
  CODEX: "purple",
  TREASURY: "green",
  PRIVY: "crimson",
  CONDUIT: "lime",
  COURT: "gold",
  WARD: "crimson",
};

/** One-line descriptors for each subsystem, surfaced in nav + dashboards. */
export const SUBSYSTEM_LABEL: Record<Subsystem, { name: string; tagline: string }> = {
  THRONE: { name: "Throne", tagline: "Executive command dashboard" },
  VIZIER: { name: "Vizier", tagline: "AI chief of staff" },
  REALM: { name: "Realm", tagline: "Companies & organization" },
  COURIER: { name: "Courier", tagline: "Unified communications" },
  COUNCIL: { name: "Council", tagline: "Meeting management" },
  HERALD: { name: "Herald", tagline: "Broadcasts & proclamations" },
  WRIT: { name: "Writ", tagline: "Delegation engine" },
  SEAL: { name: "Seal", tagline: "Approvals & authority" },
  EDICT: { name: "Edict", tagline: "Automation & rules" },
  ALMANAC: { name: "Almanac", tagline: "Calendar & travel" },
  VAULT: { name: "Vault", tagline: "Documents & e-sign" },
  CHANCERY: { name: "Chancery", tagline: "Reporting & briefings" },
  CHRONICLE: { name: "Chronicle", tagline: "Analytics & engagement" },
  CODEX: { name: "Codex", tagline: "Decisions & risk" },
  TREASURY: { name: "Treasury", tagline: "Financial visibility" },
  PRIVY: { name: "Privy", tagline: "Personal & family sphere" },
  CONDUIT: { name: "Conduit", tagline: "Integrations & API" },
  COURT: { name: "Court", tagline: "Membership & identity" },
  WARD: { name: "Ward", tagline: "Security & audit" },
};

export function subsystemHex(subsystem: Subsystem): string {
  return SPECTRUM[SUBSYSTEM_COLOR[subsystem]];
}
