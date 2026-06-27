-- =====================================================================
-- RAJASK · Migration 0013 — Phase 4 Reach & Polish
--   REALM (companies exist; + OKRs) · CONDUIT (connectors/API/webhooks) ·
--   PRIVY (personal sphere — strict PII boundary, NO broad audit)
-- =====================================================================

-- ============================ REALM (OKRs) ===========================
create table public.okrs (
  id            uuid primary key default gen_random_uuid(),
  realm_id      uuid not null references public.realms(id) on delete cascade,
  company_id    uuid references public.companies(id) on delete set null,
  owner_user_id uuid references public.users(id),
  objective     text not null,
  key_result    text,
  progress      integer not null default 0 check (progress between 0 and 100),
  period        text,
  parent_okr_id uuid references public.okrs(id) on delete set null,
  status        text not null default 'active' check (status in ('active','done','dropped')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
create index okrs_realm_idx on public.okrs(realm_id);

-- ============================ CONDUIT ================================
create table public.integration_connectors (
  id           uuid primary key default gen_random_uuid(),
  realm_id     uuid not null references public.realms(id) on delete cascade,
  provider     text not null,
  label        text,
  status       text not null default 'disconnected' check (status in ('connected','disconnected','error')),
  config       jsonb not null default '{}'::jsonb,
  created_by   uuid references public.users(id),
  last_sync_at timestamptz,
  health       jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index connectors_realm_idx on public.integration_connectors(realm_id);

create table public.api_keys (
  id           uuid primary key default gen_random_uuid(),
  realm_id     uuid not null references public.realms(id) on delete cascade,
  name         text not null,
  key_prefix   text not null,
  key_hash     text not null,
  scopes       text[] not null default array[]::text[],
  created_by   uuid references public.users(id),
  last_used_at timestamptz,
  revoked_at   timestamptz,
  created_at   timestamptz not null default now()
);
create index api_keys_realm_idx on public.api_keys(realm_id);

create table public.webhook_endpoints (
  id         uuid primary key default gen_random_uuid(),
  realm_id   uuid not null references public.realms(id) on delete cascade,
  url        text not null,
  secret     text not null,
  events     text[] not null default array[]::text[],
  enabled    boolean not null default true,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index webhook_endpoints_realm_idx on public.webhook_endpoints(realm_id);

-- ============================ PRIVY ==================================
-- Strict PII boundary: owner-only, never realm-visible, and deliberately
-- NOT wired to the generic audit trigger (its body must not reach WARD).
create table public.privy_items (
  id            uuid primary key default gen_random_uuid(),
  realm_id      uuid not null references public.realms(id) on delete cascade,
  owner_user_id uuid not null references public.users(id) on delete cascade,
  kind          text not null default 'note'
                  check (kind in ('reminder','note','contact','document','finance','event','wellbeing')),
  title         text not null,
  body          text,
  due_at        timestamptz,
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
create index privy_items_owner_idx on public.privy_items(owner_user_id);

-- ---------------------------------------------------------------------
-- updated_at + audit triggers (PRIVY: updated_at only, NO audit)
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['okrs','integration_connectors','webhook_endpoints','privy_items'] loop
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at();','set_updated_at_'||t,t);
  end loop;
  foreach t in array array['okrs','integration_connectors','api_keys','webhook_endpoints'] loop
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function audit.log_change();','audit_'||t,t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Enable + FORCE RLS + grants
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['okrs','integration_connectors','api_keys','webhook_endpoints','privy_items'] loop
    execute format('alter table public.%I enable row level security;',t);
    execute format('alter table public.%I force row level security;',t);
    execute format('grant select, insert, update, delete on public.%I to authenticated;',t);
  end loop;
end $$;

-- REALM / OKRs
create policy okrs_select on public.okrs for select to authenticated
  using (public.rajask_has_permission(realm_id, company_id, 'REALM', 'view'));
create policy okrs_write on public.okrs for all to authenticated
  using (public.rajask_has_permission(realm_id, company_id, 'REALM', 'edit'))
  with check (public.rajask_has_permission(realm_id, company_id, 'REALM', 'edit'));

-- CONDUIT
create policy connectors_select on public.integration_connectors for select to authenticated
  using (public.rajask_has_permission(realm_id, null, 'CONDUIT', 'view'));
create policy connectors_write on public.integration_connectors for all to authenticated
  using (public.rajask_has_permission(realm_id, null, 'CONDUIT', 'edit'))
  with check (public.rajask_has_permission(realm_id, null, 'CONDUIT', 'edit'));
create policy api_keys_select on public.api_keys for select to authenticated
  using (public.rajask_has_permission(realm_id, null, 'CONDUIT', 'admin'));
create policy api_keys_write on public.api_keys for all to authenticated
  using (public.rajask_has_permission(realm_id, null, 'CONDUIT', 'admin'))
  with check (public.rajask_has_permission(realm_id, null, 'CONDUIT', 'admin'));
create policy webhooks_select on public.webhook_endpoints for select to authenticated
  using (public.rajask_has_permission(realm_id, null, 'CONDUIT', 'admin'));
create policy webhooks_write on public.webhook_endpoints for all to authenticated
  using (public.rajask_has_permission(realm_id, null, 'CONDUIT', 'admin'))
  with check (public.rajask_has_permission(realm_id, null, 'CONDUIT', 'admin'));

-- PRIVY (owner-only)
create policy privy_all on public.privy_items for all to authenticated
  using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());
