/**
 * Branded id types. They are strings at runtime but distinct at compile time,
 * so a `CompanyId` can never be passed where a `RealmId` is expected.
 */

type Brand<T, B extends string> = T & { readonly __brand: B };

export type RealmId = Brand<string, "RealmId">;
export type CompanyId = Brand<string, "CompanyId">;
export type UserId = Brand<string, "UserId">;
export type MembershipId = Brand<string, "MembershipId">;
export type TitleId = Brand<string, "TitleId">;
export type PermissionGrantId = Brand<string, "PermissionGrantId">;
export type AuditEventId = Brand<string, "AuditEventId">;
export type NotificationId = Brand<string, "NotificationId">;
export type AttachmentId = Brand<string, "AttachmentId">;

/** Cast a raw string (from the DB) to a branded id. */
export const asId = {
  realm: (s: string) => s as RealmId,
  company: (s: string) => s as CompanyId,
  user: (s: string) => s as UserId,
  membership: (s: string) => s as MembershipId,
  title: (s: string) => s as TitleId,
  grant: (s: string) => s as PermissionGrantId,
  audit: (s: string) => s as AuditEventId,
  notification: (s: string) => s as NotificationId,
  attachment: (s: string) => s as AttachmentId,
};
