import type {
  Decision,
  GrantView,
  MembershipView,
  ResolveInput,
} from "./types";

/**
 * The pure permission resolver.
 *
 * This encodes EXACTLY the same precedence the SQL `rajask_has_permission`
 * function enforces at the RLS layer (the single source of truth for
 * enforcement). Keeping a pure mirror lets us unit-test the composition rules
 * fast and reuse them for optimistic client-side UI gating.
 *
 * Precedence:
 *   1. Sovereign        → allow (unrestricted within the realm)
 *   2. Explicit deny    → deny  (deny always wins)
 *   3. Explicit allow   → allow
 *   4. Title matrix     → allow if any active membership's title grants it
 *   5. otherwise        → deny  (default-deny)
 *
 * A grant/membership only counts when active and within its time window, and
 * when its company scope matches the request (realm-scope = null matches any).
 */
export function resolvePermission(input: ResolveInput): Decision {
  const { now, request, memberships, grants, matrix } = input;
  const wantCompany = request.companyId ?? null;

  const activeMemberships = memberships.filter((m) => isMembershipActive(m, now));
  if (activeMemberships.length === 0) {
    return { allowed: false, reason: "no_grant" };
  }

  // 1) Sovereign bypass.
  if (activeMemberships.some((m) => m.isSovereign)) {
    return { allowed: true, reason: "sovereign" };
  }

  const activeMembershipIds = new Set(activeMemberships.map((m) => m.id));

  // 2/3) Explicit grants on the actor's active memberships, scoped + in-window.
  const relevantGrants = grants.filter(
    (g) =>
      activeMembershipIds.has(g.membershipId) &&
      g.subsystem === request.subsystem &&
      g.action === request.action &&
      isWindowOpen(g.startsAt, g.endsAt, now) &&
      companyMatches(membershipFor(activeMemberships, g), wantCompany),
  );
  if (relevantGrants.some((g) => g.effect === "deny")) {
    return { allowed: false, reason: "explicit_deny" };
  }
  if (relevantGrants.some((g) => g.effect === "allow")) {
    return { allowed: true, reason: "explicit_allow" };
  }

  // 4) Title matrix.
  const titleIdsInScope = new Set(
    activeMemberships.filter((m) => companyMatches(m, wantCompany)).map((m) => m.titleId),
  );
  const matrixAllows = matrix.some(
    (c) =>
      c.allowed &&
      c.subsystem === request.subsystem &&
      c.action === request.action &&
      titleIdsInScope.has(c.titleId),
  );
  if (matrixAllows) {
    return { allowed: true, reason: "title_matrix" };
  }

  return { allowed: false, reason: "no_grant" };
}

/**
 * The maximum delegated authority limit (e.g. a SEAL monetary cap) the actor
 * holds for an action, as a NUMERIC string, or null if none is defined.
 * Sovereigns are unbounded — callers should treat sovereign as no-limit.
 */
export function resolveAuthorityLimit(input: ResolveInput): string | null {
  const { now, request, memberships, grants } = input;
  const wantCompany = request.companyId ?? null;
  const activeMemberships = memberships.filter((m) => isMembershipActive(m, now));
  const activeMembershipIds = new Set(activeMemberships.map((m) => m.id));

  const limits = grants
    .filter(
      (g) =>
        activeMembershipIds.has(g.membershipId) &&
        g.effect === "allow" &&
        g.subsystem === request.subsystem &&
        g.action === request.action &&
        g.authorityLimit !== null &&
        isWindowOpen(g.startsAt, g.endsAt, now) &&
        companyMatches(membershipFor(activeMemberships, g), wantCompany),
    )
    .map((g) => g.authorityLimit as string);

  if (limits.length === 0) return null;
  // Compare as numbers for max selection; return the original string (lossless).
  return limits.reduce((max, cur) => (Number(cur) > Number(max) ? cur : max));
}

// ---------------------------------------------------------------------------

function isMembershipActive(m: MembershipView, now: Date): boolean {
  return (
    m.status === "active" &&
    m.deletedAt === null &&
    isWindowOpen(m.startsAt, m.endsAt, now)
  );
}

function isWindowOpen(startsAt: Date | null, endsAt: Date | null, now: Date): boolean {
  if (startsAt && startsAt.getTime() > now.getTime()) return false;
  if (endsAt && endsAt.getTime() <= now.getTime()) return false;
  return true;
}

/** A null company scope (realm-scope membership) matches any requested company. */
function companyMatches(
  m: MembershipView | undefined,
  wantCompany: string | null,
): boolean {
  if (!m) return false;
  if (m.companyId === null) return true;
  if (wantCompany === null) return true;
  return m.companyId === wantCompany;
}

function membershipFor(
  memberships: MembershipView[],
  grant: GrantView,
): MembershipView | undefined {
  return memberships.find((m) => m.id === grant.membershipId);
}
