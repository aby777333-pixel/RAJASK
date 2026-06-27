import { describe, it, expect } from "vitest";
import { resolvePermission, resolveAuthorityLimit } from "./resolver";
import type { GrantView, MatrixCell, MembershipView, ResolveInput } from "./types";

const NOW = new Date("2026-06-27T12:00:00Z");

function membership(over: Partial<MembershipView> = {}): MembershipView {
  return {
    id: "m1",
    companyId: null,
    titleId: "t-director",
    isSovereign: false,
    status: "active",
    startsAt: null,
    endsAt: null,
    deletedAt: null,
    ...over,
  };
}

function base(over: Partial<ResolveInput> = {}): ResolveInput {
  return {
    now: NOW,
    request: { subsystem: "WRIT", action: "create" },
    memberships: [],
    grants: [],
    matrix: [],
    ...over,
  };
}

describe("resolvePermission — precedence", () => {
  it("denies when the actor has no active membership (default-deny)", () => {
    expect(resolvePermission(base()).allowed).toBe(false);
  });

  it("allows the Sovereign anything within the realm", () => {
    const d = resolvePermission(
      base({
        memberships: [membership({ isSovereign: true })],
        request: { subsystem: "PRIVY", action: "admin" },
      }),
    );
    expect(d).toEqual({ allowed: true, reason: "sovereign" });
  });

  it("grants via the title matrix", () => {
    const matrix: MatrixCell[] = [
      { titleId: "t-director", subsystem: "WRIT", action: "create", allowed: true },
    ];
    const d = resolvePermission(base({ memberships: [membership()], matrix }));
    expect(d).toEqual({ allowed: true, reason: "title_matrix" });
  });

  it("denies actions absent from the matrix", () => {
    const matrix: MatrixCell[] = [
      { titleId: "t-director", subsystem: "WRIT", action: "view", allowed: true },
    ];
    const d = resolvePermission(base({ memberships: [membership()], matrix }));
    expect(d.allowed).toBe(false);
  });

  it("lets an explicit allow grant override a missing matrix cell", () => {
    const grants: GrantView[] = [
      {
        membershipId: "m1",
        subsystem: "WRIT",
        action: "create",
        effect: "allow",
        authorityLimit: null,
        startsAt: null,
        endsAt: null,
      },
    ];
    const d = resolvePermission(base({ memberships: [membership()], grants }));
    expect(d).toEqual({ allowed: true, reason: "explicit_allow" });
  });

  it("lets an explicit deny override the title matrix (deny wins)", () => {
    const matrix: MatrixCell[] = [
      { titleId: "t-director", subsystem: "WRIT", action: "create", allowed: true },
    ];
    const grants: GrantView[] = [
      {
        membershipId: "m1",
        subsystem: "WRIT",
        action: "create",
        effect: "deny",
        authorityLimit: null,
        startsAt: null,
        endsAt: null,
      },
    ];
    const d = resolvePermission(base({ memberships: [membership()], grants, matrix }));
    expect(d).toEqual({ allowed: false, reason: "explicit_deny" });
  });
});

describe("resolvePermission — time bounds", () => {
  const matrix: MatrixCell[] = [
    { titleId: "t-director", subsystem: "WRIT", action: "create", allowed: true },
  ];

  it("ignores a membership that has not yet started", () => {
    const future = new Date("2026-07-01T00:00:00Z");
    const d = resolvePermission(
      base({ memberships: [membership({ startsAt: future })], matrix }),
    );
    expect(d.allowed).toBe(false);
  });

  it("ignores a membership that has already expired", () => {
    const past = new Date("2026-06-01T00:00:00Z");
    const d = resolvePermission(
      base({ memberships: [membership({ endsAt: past })], matrix }),
    );
    expect(d.allowed).toBe(false);
  });

  it("ignores a suspended or soft-deleted membership", () => {
    expect(
      resolvePermission(base({ memberships: [membership({ status: "suspended" })], matrix }))
        .allowed,
    ).toBe(false);
    expect(
      resolvePermission(base({ memberships: [membership({ deletedAt: NOW })], matrix }))
        .allowed,
    ).toBe(false);
  });
});

describe("resolvePermission — company scope / tenant isolation", () => {
  const matrix: MatrixCell[] = [
    { titleId: "t-mgr", subsystem: "WRIT", action: "create", allowed: true },
  ];

  it("denies cross-company when membership is scoped to a different company", () => {
    const d = resolvePermission(
      base({
        request: { subsystem: "WRIT", action: "create", companyId: "company-B" },
        memberships: [membership({ companyId: "company-A", titleId: "t-mgr" })],
        matrix,
      }),
    );
    expect(d.allowed).toBe(false);
  });

  it("allows within the membership's own company", () => {
    const d = resolvePermission(
      base({
        request: { subsystem: "WRIT", action: "create", companyId: "company-A" },
        memberships: [membership({ companyId: "company-A", titleId: "t-mgr" })],
        matrix,
      }),
    );
    expect(d.allowed).toBe(true);
  });

  it("allows a realm-scoped (group) membership across any company", () => {
    const d = resolvePermission(
      base({
        request: { subsystem: "WRIT", action: "create", companyId: "company-B" },
        memberships: [membership({ companyId: null, titleId: "t-mgr" })],
        matrix,
      }),
    );
    expect(d.allowed).toBe(true);
  });
});

describe("resolveAuthorityLimit — SEAL DOA", () => {
  it("returns the highest applicable authority limit as a lossless string", () => {
    const grants: GrantView[] = [
      {
        membershipId: "m1",
        subsystem: "SEAL",
        action: "approve",
        effect: "allow",
        authorityLimit: "500000.00",
        startsAt: null,
        endsAt: null,
      },
      {
        membershipId: "m1",
        subsystem: "SEAL",
        action: "approve",
        effect: "allow",
        authorityLimit: "1000000.00",
        startsAt: null,
        endsAt: null,
      },
    ];
    const limit = resolveAuthorityLimit(
      base({
        request: { subsystem: "SEAL", action: "approve" },
        memberships: [membership()],
        grants,
      }),
    );
    expect(limit).toBe("1000000.00");
  });

  it("returns null when no monetary authority is delegated", () => {
    const limit = resolveAuthorityLimit(
      base({ request: { subsystem: "SEAL", action: "approve" }, memberships: [membership()] }),
    );
    expect(limit).toBeNull();
  });
});
