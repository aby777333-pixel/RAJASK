/**
 * Typed error hierarchy for RAJASK.
 *
 * Every error carries a stable `code` (for logs / i18n / API responses) and an
 * optional `meta` bag. Domain code returns these via Result; the transport
 * layer (server actions, API) maps `code` to an HTTP status.
 */

export type ErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN" // permission resolver denied
  | "TENANT_VIOLATION" // attempted cross-realm / cross-company access
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "AUTHORITY_LIMIT_EXCEEDED" // SEAL DOA / monetary limit
  | "RATE_LIMITED"
  | "INTEGRATION_FAILURE"
  | "INTERNAL";

export interface AppErrorShape {
  readonly code: ErrorCode;
  readonly message: string;
  readonly meta?: Record<string, unknown>;
}

export class AppError extends Error implements AppErrorShape {
  readonly code: ErrorCode;
  readonly meta?: Record<string, unknown>;

  constructor(code: ErrorCode, message: string, meta?: Record<string, unknown>) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.meta = meta;
  }

  toJSON(): AppErrorShape {
    return { code: this.code, message: this.message, meta: this.meta };
  }
}

export const Errors = {
  unauthenticated: (message = "Authentication required") =>
    new AppError("UNAUTHENTICATED", message),
  forbidden: (message = "You do not hold the rights for this action", meta?: Record<string, unknown>) =>
    new AppError("FORBIDDEN", message, meta),
  tenantViolation: (message = "Cross-tenant access is not permitted", meta?: Record<string, unknown>) =>
    new AppError("TENANT_VIOLATION", message, meta),
  notFound: (message = "Not found") => new AppError("NOT_FOUND", message),
  validation: (message: string, meta?: Record<string, unknown>) =>
    new AppError("VALIDATION", message, meta),
  conflict: (message: string) => new AppError("CONFLICT", message),
  authorityLimitExceeded: (message = "Beyond your delegated authority", meta?: Record<string, unknown>) =>
    new AppError("AUTHORITY_LIMIT_EXCEEDED", message, meta),
  rateLimited: (message = "Too many requests") => new AppError("RATE_LIMITED", message),
  integrationFailure: (message: string, meta?: Record<string, unknown>) =>
    new AppError("INTEGRATION_FAILURE", message, meta),
  internal: (message = "Internal error") => new AppError("INTERNAL", message),
} as const;

const HTTP_STATUS: Record<ErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  TENANT_VIOLATION: 403,
  NOT_FOUND: 404,
  VALIDATION: 422,
  CONFLICT: 409,
  AUTHORITY_LIMIT_EXCEEDED: 403,
  RATE_LIMITED: 429,
  INTEGRATION_FAILURE: 502,
  INTERNAL: 500,
};

export function httpStatusForError(code: ErrorCode): number {
  return HTTP_STATUS[code];
}
