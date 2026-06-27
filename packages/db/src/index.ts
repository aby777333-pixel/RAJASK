export * from "./client";
export type {
  Database,
  Json,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "./types.gen";

import type { Tables, TablesInsert } from "./types.gen";

// Convenience row aliases for the foundation tables.
export type RealmRow = Tables<"realms">;
export type CompanyRow = Tables<"companies">;
export type UserRow = Tables<"users">;
export type MembershipRow = Tables<"memberships">;
export type TitleRow = Tables<"titles">;
export type TitlePermissionRow = Tables<"title_permissions">;
export type PermissionGrantRow = Tables<"permission_grants">;
export type AuditEventRow = Tables<"audit_events">;
export type NotificationRow = Tables<"notifications">;
export type AttachmentRow = Tables<"attachments">;

export type NotificationInsert = TablesInsert<"notifications">;
export type CompanyInsert = TablesInsert<"companies">;

// COURT + COURIER
export type InvitationRow = Tables<"invitations">;
export type ConversationRow = Tables<"conversations">;
export type ConversationMemberRow = Tables<"conversation_members">;
export type MessageRow = Tables<"messages">;
export type MessageReactionRow = Tables<"message_reactions">;
export type MessageInsert = TablesInsert<"messages">;
