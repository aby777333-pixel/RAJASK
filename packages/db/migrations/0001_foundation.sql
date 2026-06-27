-- =====================================================================
-- RAJASK · Migration 0001 — Foundation tables (§3 core data & tenancy)
-- ---------------------------------------------------------------------
-- Every table is multi-tenant (realm_id), timestamped, soft-deletable
-- where appropriate. RLS + audit are applied in migration 0002 in the
-- same logical change set (architectural law #2: RLS-first).
-- =====================================================================

create extension if not exists pgcrypto;

create schema if not exists audit;

-- ---------------------------------------------------------------------
-- users — global profile, one row per auth.users identity. A user may
-- belong to many realms/companies via memberships.
-- ---------------------------------------------------------------------
create table public.users (
  id           uuid primary key,            -- equals auth.users.id
  email        text,
  full_name    text,
  avatar_url   text,
  phone        text,
  locale       text not null default 'en',
  timezone     text not null default 'Asia/Kolkata',
  reachability jsonb not null default '{}'::jsonb,   -- channels + windows
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);
comment on table public.users is 'Global user profile mirroring auth.users.';

-- ---------------------------------------------------------------------
-- realms — the sovereign account (one CEO / org group). The kingdom.
-- ---------------------------------------------------------------------
create table public.realms (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  slug           text not null unique,
  owner_user_id  uuid not null references public.users(id),
  brand          jsonb not null default '{}'::jsonb,   -- white-label: logo, palette, note
  data_residency text not null default 'in',           -- india-first (DPDP)
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz
);
comment on table public.realms is 'The sovereign account — one CEO / org group.';

-- ---------------------------------------------------------------------
-- companies — companies, subsidiaries, SPVs, family offices, JVs, holdings.
-- ---------------------------------------------------------------------
create table public.companies (
  id                uuid primary key default gen_random_uuid(),
  realm_id          uuid not null references public.realms(id) on delete cascade,
  parent_company_id uuid references public.companies(id) on delete set null,
  name              text not null,
  kind              text not null default 'company'
                      check (kind in ('company','subsidiary','spv','family_office','jv','holding','department')),
  currency          text not null default 'INR',
  metadata          jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz
);
create index companies_realm_idx on public.companies(realm_id);
comment on table public.companies is 'Companies / subsidiaries / SPVs / family offices / JVs / holdings.';

-- ---------------------------------------------------------------------
-- titles — permission templates (§4 investiture). Realm-scoped; `key`
-- references a TITLE_TEMPLATE from @rajask/core, null for fully custom.
-- ---------------------------------------------------------------------
create table public.titles (
  id          uuid primary key default gen_random_uuid(),
  realm_id    uuid not null references public.realms(id) on delete cascade,
  key         text,                          -- TitleTemplate, null = custom
  name        text not null,
  description text,
  is_system   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
create index titles_realm_idx on public.titles(realm_id);
comment on table public.titles is 'Reusable permission templates investing rights on members.';

-- ---------------------------------------------------------------------
-- title_permissions — the permission matrix as DATA (§10). One row per
-- (title, subsystem, action). The resolver reads this; adding a subsystem
-- never requires touching resolver code.
-- ---------------------------------------------------------------------
create table public.title_permissions (
  id         uuid primary key default gen_random_uuid(),
  realm_id   uuid not null references public.realms(id) on delete cascade,
  title_id   uuid not null references public.titles(id) on delete cascade,
  subsystem  text not null,
  action     text not null,
  allowed    boolean not null default true,
  unique (title_id, subsystem, action)
);
create index title_permissions_title_idx on public.title_permissions(title_id);
comment on table public.title_permissions is 'Permission matrix as data: title x subsystem x action.';

-- ---------------------------------------------------------------------
-- memberships — user x realm x company x title. The court roll.
-- company_id NULL ⇒ realm-scoped membership (group visibility).
-- ---------------------------------------------------------------------
create table public.memberships (
  id            uuid primary key default gen_random_uuid(),
  realm_id      uuid not null references public.realms(id) on delete cascade,
  company_id    uuid references public.companies(id) on delete cascade,
  user_id       uuid not null references public.users(id) on delete cascade,
  title_id      uuid not null references public.titles(id),
  scope         text not null default 'company' check (scope in ('realm','company')),
  status        text not null default 'active' check (status in ('invited','active','suspended','archived')),
  is_sovereign  boolean not null default false,
  starts_at     timestamptz,
  ends_at       timestamptz,                 -- time-bound membership auto-expiry
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  unique (realm_id, company_id, user_id, title_id)
);
create index memberships_user_idx on public.memberships(user_id);
create index memberships_realm_idx on public.memberships(realm_id);
create index memberships_company_idx on public.memberships(company_id);
comment on table public.memberships is 'Who is admitted to the court and the title they hold.';

-- ---------------------------------------------------------------------
-- permission_grants — explicit per-membership overrides (§4). Time-bound,
-- deny-capable, with optional authority limit (SEAL DOA monetary cap).
-- ---------------------------------------------------------------------
create table public.permission_grants (
  id                 uuid primary key default gen_random_uuid(),
  realm_id           uuid not null references public.realms(id) on delete cascade,
  membership_id      uuid not null references public.memberships(id) on delete cascade,
  subsystem          text not null,
  action             text not null,
  effect             text not null default 'allow' check (effect in ('allow','deny')),
  authority_limit    numeric,                -- NEVER a float — NUMERIC (law #1)
  authority_currency text,
  reason             text,
  granted_by         uuid references public.users(id),
  starts_at          timestamptz not null default now(),
  ends_at            timestamptz,            -- auto-expire
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index permission_grants_membership_idx on public.permission_grants(membership_id);
comment on table public.permission_grants is 'Explicit, time-bound permission overrides + authority limits.';

-- ---------------------------------------------------------------------
-- audit_events — append-only (law #4). Never updated, never deleted.
-- ---------------------------------------------------------------------
create table public.audit_events (
  id            uuid primary key default gen_random_uuid(),
  realm_id      uuid,
  company_id    uuid,
  actor_user_id uuid,
  action        text not null,              -- INSERT/UPDATE/DELETE or domain verb
  target_table  text,
  target_id     uuid,
  subsystem     text,
  before        jsonb,
  after         jsonb,
  ip            inet,
  device        text,
  created_at    timestamptz not null default now()
);
create index audit_events_realm_idx on public.audit_events(realm_id, created_at desc);
create index audit_events_target_idx on public.audit_events(target_table, target_id);
comment on table public.audit_events is 'Append-only audit log. Immutable.';

-- ---------------------------------------------------------------------
-- notifications — unified notification center (cross-cutting §6).
-- ---------------------------------------------------------------------
create table public.notifications (
  id                uuid primary key default gen_random_uuid(),
  realm_id          uuid not null references public.realms(id) on delete cascade,
  recipient_user_id uuid not null references public.users(id) on delete cascade,
  subsystem         text,
  kind              text not null,
  title             text not null,
  body              text,
  priority          text not null default 'normal' check (priority in ('low','normal','high','vip')),
  channel           text not null default 'in_app' check (channel in ('in_app','whatsapp','sms','email','push')),
  payload           jsonb not null default '{}'::jsonb,
  read_at           timestamptz,
  created_at        timestamptz not null default now()
);
create index notifications_recipient_idx on public.notifications(recipient_user_id, created_at desc);
comment on table public.notifications is 'Unified notification center with priority + channel routing.';

-- ---------------------------------------------------------------------
-- attachments — files referenced across subsystems (Storage pointers).
-- ---------------------------------------------------------------------
create table public.attachments (
  id            uuid primary key default gen_random_uuid(),
  realm_id      uuid not null references public.realms(id) on delete cascade,
  company_id    uuid references public.companies(id) on delete set null,
  owner_user_id uuid references public.users(id),
  subsystem     text,
  bucket        text not null,
  path          text not null,
  filename      text not null,
  content_type  text,
  byte_size     bigint,
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
create index attachments_realm_idx on public.attachments(realm_id);
comment on table public.attachments is 'Storage object pointers used across subsystems.';
