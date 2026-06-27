import type { Action, Subsystem } from "@rajask/core";

/** Who is acting, and within which tenancy scope. */
export interface Actor {
  userId: string;
  realmId: string;
  /** null ⇒ realm-scope (group) request. */
  companyId?: string | null;
}

/** A permission question: "may <actor> <action> within <subsystem>?" */
export interface PermissionRequest {
  subsystem: Subsystem;
  action: Action;
  companyId?: string | null;
}

// ---- Pure-resolver data views (mirror the DB rows the SQL resolver reads) ----

export interface MembershipView {
  id: string;
  companyId: string | null; // null ⇒ realm-scope
  titleId: string;
  isSovereign: boolean;
  status: "invited" | "active" | "suspended" | "archived";
  startsAt: Date | null;
  endsAt: Date | null;
  deletedAt: Date | null;
}

export interface GrantView {
  membershipId: string;
  subsystem: Subsystem;
  action: Action;
  effect: "allow" | "deny";
  authorityLimit: string | null; // NUMERIC as string — never a float
  startsAt: Date | null;
  endsAt: Date | null;
}

export interface MatrixCell {
  titleId: string;
  subsystem: Subsystem;
  action: Action;
  allowed: boolean;
}

export interface ResolveInput {
  now: Date;
  request: PermissionRequest;
  memberships: MembershipView[];
  grants: GrantView[];
  matrix: MatrixCell[];
}

export type DecisionReason =
  | "sovereign"
  | "explicit_deny"
  | "explicit_allow"
  | "title_matrix"
  | "no_grant";

export interface Decision {
  allowed: boolean;
  reason: DecisionReason;
}
