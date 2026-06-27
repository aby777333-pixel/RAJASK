/**
 * The permission vocabulary — the shared language spoken by the permission
 * resolver (`@rajask/auth`), the RLS helpers (`@rajask/db`), and the seeded
 * permission matrix (§10 of the spec).
 *
 * Adding a subsystem here + seeding its defaults must NOT require touching the
 * resolver. The resolver is generic over (subsystem, action).
 */

/** The Regalia — the 17 permission-gated subsystems. */
export const SUBSYSTEMS = [
  "THRONE", // executive command dashboard
  "VIZIER", // AI chief of staff
  "REALM", // multi-company architecture
  "COURIER", // unified comms + WhatsApp
  "COUNCIL", // meeting management
  "HERALD", // broadcasts & proclamations
  "WRIT", // delegation engine
  "SEAL", // approval engine & authority matrix
  "EDICT", // automation & rules engine
  "ALMANAC", // calendar, scheduling & travel
  "VAULT", // document management & e-sign
  "CHANCERY", // reporting & briefing engine
  "CHRONICLE", // analytics, engagement & BI
  "CODEX", // decision & risk register
  "TREASURY", // financial visibility
  "PRIVY", // personal & family sphere
  "CONDUIT", // integrations, API & webhooks
  "COURT", // membership, identity & permissions
  "WARD", // security, access & audit
] as const;

export type Subsystem = (typeof SUBSYSTEMS)[number];

/** The verbs a title may be granted against a subsystem. */
export const ACTIONS = [
  "view",
  "create",
  "edit",
  "delete",
  "approve",
  "export",
  "configure",
  "admin",
] as const;

export type Action = (typeof ACTIONS)[number];

/** A single permission cell: "may <action> within <subsystem>". */
export interface PermissionKey {
  subsystem: Subsystem;
  action: Action;
}

export function permissionString(subsystem: Subsystem, action: Action): string {
  return `${subsystem}:${action}`;
}

export function parsePermissionString(value: string): PermissionKey | null {
  const [subsystem, action] = value.split(":");
  if (!subsystem || !action) return null;
  if (!SUBSYSTEMS.includes(subsystem as Subsystem)) return null;
  if (!ACTIONS.includes(action as Action)) return null;
  return { subsystem: subsystem as Subsystem, action: action as Action };
}

/**
 * The supported title templates (§4). Each maps to a default permission set
 * seeded in the DB; all are overridable by the Sovereign.
 */
export const TITLE_TEMPLATES = [
  // The Sovereign
  "SOVEREIGN", // the CEO / super-admin — unrestricted within their realm
  // Internal
  "CHAIRMAN",
  "DIRECTOR",
  "EXECUTIVE",
  "MANAGER",
  "DEPARTMENT_HEAD",
  "TEAM_LEAD",
  "EMPLOYEE",
  "PA_SECRETARY",
  // External
  "CONTRACTOR",
  "CONSULTANT",
  "FREELANCER",
  "VENDOR",
  "SUPPLIER",
  "LAWYER",
  "AUDITOR",
  "INVESTOR",
  "BOARD_MEMBER",
  "ADVISOR",
  "CLIENT",
  "GUEST",
  // Industry
  "BROKER",
  "REAL_ESTATE_BROKER",
  "BUYER",
  "SELLER",
  "AGENT",
  "PROPERTY_DEVELOPER",
  "AFFILIATE",
  "INTRODUCING_BROKER",
  "CHANNEL_PARTNER",
  // Organizations
  "PARTNER_COMPANY",
  "AGENCY",
  "SERVICE_PROVIDER",
] as const;

export type TitleTemplate = (typeof TITLE_TEMPLATES)[number];

/** Scope at which a membership/title operates. */
export type MembershipScope = "realm" | "company";
