import { describe, it, expect } from "vitest";
import {
  SUBSYSTEMS,
  ACTIONS,
  permissionString,
  parsePermissionString,
} from "./permissions";

describe("permission vocabulary", () => {
  it("covers all 17 Regalia subsystems plus COURT and WARD", () => {
    expect(SUBSYSTEMS).toContain("THRONE");
    expect(SUBSYSTEMS).toContain("VIZIER");
    expect(SUBSYSTEMS).toContain("COURT");
    expect(SUBSYSTEMS).toContain("WARD");
    expect(new Set(SUBSYSTEMS).size).toBe(SUBSYSTEMS.length);
  });

  it("round-trips permission strings", () => {
    const s = permissionString("CHRONICLE", "export");
    expect(s).toBe("CHRONICLE:export");
    expect(parsePermissionString(s)).toEqual({
      subsystem: "CHRONICLE",
      action: "export",
    });
  });

  it("rejects malformed or unknown permission strings", () => {
    expect(parsePermissionString("NOPE:view")).toBeNull();
    expect(parsePermissionString("THRONE:fly")).toBeNull();
    expect(parsePermissionString("garbage")).toBeNull();
  });

  it("defines the eight canonical actions", () => {
    expect(ACTIONS).toEqual([
      "view",
      "create",
      "edit",
      "delete",
      "approve",
      "export",
      "configure",
      "admin",
    ]);
  });
});
