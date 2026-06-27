import type { RajaskClient } from "@rajask/db";
import { Money } from "@rajask/core";
import { Errors, type AppError } from "@rajask/core/errors";
import { ok, err, type Result } from "@rajask/core/result";
import type { Actor, PermissionRequest } from "./types";

/**
 * Server-side permission resolver.
 *
 * Delegates to the SQL `rajask_*` functions so that server actions and RLS
 * policies enforce IDENTICAL logic — the database is the single source of
 * truth (§2). The supplied client MUST be the request-scoped, RLS-bound
 * client (the acting user's session), never the service-role client.
 */
export class PermissionService {
  constructor(private readonly client: RajaskClient) {}

  /** Returns whether the actor may perform the request. */
  async can(actor: Actor, req: PermissionRequest): Promise<boolean> {
    const { data, error } = await this.client.rpc("rajask_has_permission", {
      p_realm: actor.realmId,
      p_company: req.companyId ?? actor.companyId ?? (null as unknown as string),
      p_subsystem: req.subsystem,
      p_action: req.action,
    });
    if (error) return false;
    return data === true;
  }

  /**
   * Asserts the actor may perform the request; returns a typed Result so
   * callers handle denial explicitly rather than relying on thrown errors.
   */
  async assert(actor: Actor, req: PermissionRequest): Promise<Result<true, AppError>> {
    const allowed = await this.can(actor, req);
    if (!allowed) {
      return err(
        Errors.forbidden("You do not hold the rights for this action", {
          subsystem: req.subsystem,
          action: req.action,
        }),
      );
    }
    return ok(true);
  }

  /** The actor's max delegated authority limit for an action, or null. */
  async authorityLimit(
    actor: Actor,
    req: PermissionRequest,
    currency: string,
  ): Promise<Money | null> {
    const { data, error } = await this.client.rpc("rajask_authority_limit", {
      p_realm: actor.realmId,
      p_company: req.companyId ?? actor.companyId ?? (null as unknown as string),
      p_subsystem: req.subsystem,
      p_action: req.action,
    });
    if (error || data === null || data === undefined) return null;
    return Money.fromDb(String(data), currency);
  }

  /**
   * SEAL gate: assert the actor may approve an amount within their authority.
   * Sovereigns (no limit row) are unbounded; a defined limit is enforced with
   * Decimal precision (law #1).
   */
  async assertWithinAuthority(
    actor: Actor,
    req: PermissionRequest,
    amount: Money,
  ): Promise<Result<true, AppError>> {
    const permitted = await this.assert(actor, req);
    if (!permitted.ok) return permitted;

    const isSovereign = await this.isSovereign(actor.realmId);
    if (isSovereign) return ok(true);

    const limit = await this.authorityLimit(actor, req, amount.currency);
    if (limit === null) {
      // No explicit cap and not sovereign: the title-matrix allow stands,
      // but no monetary authority is delegated → deny the money action.
      return err(
        Errors.authorityLimitExceeded("No spending authority is delegated to you", {
          amount: amount.toJSON(),
        }),
      );
    }
    if (amount.greaterThan(limit)) {
      return err(
        Errors.authorityLimitExceeded("Amount exceeds your delegated authority", {
          amount: amount.toJSON(),
          limit: limit.toJSON(),
        }),
      );
    }
    return ok(true);
  }

  async isSovereign(realmId: string): Promise<boolean> {
    const { data, error } = await this.client.rpc("rajask_is_sovereign", {
      p_realm: realmId,
    });
    return !error && data === true;
  }

  async isRealmMember(realmId: string): Promise<boolean> {
    const { data, error } = await this.client.rpc("rajask_is_realm_member", {
      p_realm: realmId,
    });
    return !error && data === true;
  }
}

export function createPermissionService(client: RajaskClient): PermissionService {
  return new PermissionService(client);
}
