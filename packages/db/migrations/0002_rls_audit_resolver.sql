-- =====================================================================
-- RAJASK · Migration 0002 — Resolver, audit framework, default-deny RLS
-- ---------------------------------------------------------------------
-- The SQL side of the permission resolver. The TS resolver in
-- @rajask/auth mirrors this logic for server actions; RLS enforces the
-- same rules at the row level (law #2 + #3). Helper functions are
-- SECURITY DEFINER to avoid RLS recursion on membership/title lookups.
-- =====================================================================

-- ---------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Generic append-only audit trigger (law #4)
-- ---------------------------------------------------------------------
create or replace function audit.log_change()
returns trigger
language plpgsql
security definer
set search_path = public, audit
as $$
declare
  v_rec    jsonb;
  v_before jsonb;
  v_after  jsonb;
  v_realm  uuid;
  v_company uuid;
  v_target uuid;
begin
  if tg_op = 'DELETE' then
    v_before := to_jsonb(old); v_after := null; v_rec := to_jsonb(old);
  elsif tg_op = 'UPDATE' then
    v_before := to_jsonb(old); v_after := to_jsonb(new); v_rec := to_jsonb(new);
  else
    v_before := null; v_after := to_jsonb(new); v_rec := to_jsonb(new);
  end if;

  -- realm: explicit realm_id, else the realms table's own id
  v_realm := coalesce(
    nullif(v_rec->>'realm_id','')::uuid,
    case when tg_table_name = 'realms' then (v_rec->>'id')::uuid else null end
  );
  v_company := nullif(v_rec->>'company_id','')::uuid;
  v_target := nullif(v_rec->>'id','')::uuid;

  insert into public.audit_events(
    realm_id, company_id, actor_user_id, action,
    target_table, target_id, before, after
  ) values (
    v_realm, v_company, auth.uid(), tg_op,
    tg_table_name, v_target, v_before, v_after
  );

  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

-- ---------------------------------------------------------------------
-- Tenancy + permission helpers (SECURITY DEFINER — bypass RLS internally)
-- ---------------------------------------------------------------------
create or replace function public.rajask_is_realm_member(p_realm uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.memberships m
    where m.realm_id = p_realm
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.deleted_at is null
      and (m.starts_at is null or m.starts_at <= now())
      and (m.ends_at is null or m.ends_at > now())
  );
$$;

create or replace function public.rajask_is_sovereign(p_realm uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.memberships m
    where m.realm_id = p_realm
      and m.user_id = auth.uid()
      and m.is_sovereign = true
      and m.status = 'active'
      and m.deleted_at is null
  );
$$;

create or replace function public.rajask_shares_realm(p_other uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.memberships me
    join public.memberships them on them.realm_id = me.realm_id
    where me.user_id = auth.uid()
      and them.user_id = p_other
      and me.status = 'active' and me.deleted_at is null
      and them.status = 'active' and them.deleted_at is null
  );
$$;

-- The resolver: deny wins, then explicit allow, then title matrix.
-- p_company NULL means "any company / realm-scope".
create or replace function public.rajask_has_permission(
  p_realm uuid, p_company uuid, p_subsystem text, p_action text
) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  v_allow boolean := false;
  v_deny  boolean := false;
begin
  if auth.uid() is null then return false; end if;

  -- The Sovereign holds unrestricted rights within their realm.
  if public.rajask_is_sovereign(p_realm) then
    return true;
  end if;

  -- Explicit grants on the user's relevant memberships (deny wins).
  select
    coalesce(bool_or(g.effect = 'allow'), false),
    coalesce(bool_or(g.effect = 'deny'), false)
  into v_allow, v_deny
  from public.permission_grants g
  join public.memberships m on m.id = g.membership_id
  where g.realm_id = p_realm
    and m.user_id = auth.uid()
    and m.status = 'active' and m.deleted_at is null
    and (m.company_id is null or p_company is null or m.company_id = p_company)
    and g.subsystem = p_subsystem
    and g.action = p_action
    and (g.starts_at is null or g.starts_at <= now())
    and (g.ends_at is null or g.ends_at > now());

  if v_deny then return false; end if;
  if v_allow then return true; end if;

  -- Title template matrix.
  return exists (
    select 1
    from public.memberships m
    join public.title_permissions tp on tp.title_id = m.title_id
    where m.realm_id = p_realm
      and m.user_id = auth.uid()
      and m.status = 'active' and m.deleted_at is null
      and (m.starts_at is null or m.starts_at <= now())
      and (m.ends_at is null or m.ends_at > now())
      and (m.company_id is null or p_company is null or m.company_id = p_company)
      and tp.subsystem = p_subsystem
      and tp.action = p_action
      and tp.allowed = true
  );
end;
$$;

-- Maximum delegated authority limit (SEAL DOA) for an action; NULL ⇒ none
-- defined (treat as unlimited only for the Sovereign, who returns NULL here
-- but bypasses limits in app logic).
create or replace function public.rajask_authority_limit(
  p_realm uuid, p_company uuid, p_subsystem text, p_action text
) returns numeric
language sql stable security definer set search_path = public as $$
  select max(g.authority_limit)
  from public.permission_grants g
  join public.memberships m on m.id = g.membership_id
  where g.realm_id = p_realm
    and m.user_id = auth.uid()
    and m.status = 'active' and m.deleted_at is null
    and (m.company_id is null or p_company is null or m.company_id = p_company)
    and g.subsystem = p_subsystem
    and g.action = p_action
    and g.effect = 'allow'
    and g.authority_limit is not null
    and (g.starts_at is null or g.starts_at <= now())
    and (g.ends_at is null or g.ends_at > now());
$$;

-- Company visibility: sovereign, OR direct company member, OR realm-scoped
-- member holding group visibility (REALM:view).
create or replace function public.rajask_can_see_company(p_company uuid)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare v_realm uuid;
begin
  select realm_id into v_realm from public.companies where id = p_company;
  if v_realm is null then return false; end if;
  if public.rajask_is_sovereign(v_realm) then return true; end if;
  if exists (
    select 1 from public.memberships m
    where m.user_id = auth.uid() and m.company_id = p_company
      and m.status = 'active' and m.deleted_at is null
  ) then return true; end if;
  return public.rajask_has_permission(v_realm, null, 'REALM', 'view');
end;
$$;

-- ---------------------------------------------------------------------
-- auth.users -> public.users bootstrap
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id, new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Attach updated_at + audit triggers to every domain table
-- (audit_events itself is excluded — it must not audit itself)
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'users','realms','companies','titles','title_permissions',
    'memberships','permission_grants','notifications','attachments'
  ] loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at();',
      'set_updated_at_' || t, t
    );
    execute format(
      'create trigger %I after insert or update or delete on public.%I for each row execute function audit.log_change();',
      'audit_' || t, t
    );
  end loop;
end $$;

-- permission_grants has no updated_at-only concern but does get audited above.

-- ---------------------------------------------------------------------
-- Enable + FORCE RLS on every table (default-deny: no policy ⇒ no access)
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'users','realms','companies','titles','title_permissions',
    'memberships','permission_grants','audit_events','notifications','attachments'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('alter table public.%I force row level security;', t);
  end loop;
end $$;

-- =====================================================================
-- RLS POLICIES (default-deny baseline; refined per-subsystem later)
-- =====================================================================

-- users -------------------------------------------------------------
create policy users_select on public.users for select to authenticated
  using (id = auth.uid() or public.rajask_shares_realm(id));
create policy users_insert_self on public.users for insert to authenticated
  with check (id = auth.uid());
create policy users_update_self on public.users for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- realms ------------------------------------------------------------
create policy realms_select on public.realms for select to authenticated
  using (public.rajask_is_realm_member(id) or owner_user_id = auth.uid());
create policy realms_insert on public.realms for insert to authenticated
  with check (owner_user_id = auth.uid());
create policy realms_update on public.realms for update to authenticated
  using (public.rajask_is_sovereign(id) or public.rajask_has_permission(id, null, 'REALM', 'configure'))
  with check (public.rajask_is_sovereign(id) or public.rajask_has_permission(id, null, 'REALM', 'configure'));

-- companies ---------------------------------------------------------
create policy companies_select on public.companies for select to authenticated
  using (public.rajask_can_see_company(id));
create policy companies_insert on public.companies for insert to authenticated
  with check (public.rajask_has_permission(realm_id, null, 'REALM', 'create'));
create policy companies_update on public.companies for update to authenticated
  using (public.rajask_has_permission(realm_id, id, 'REALM', 'edit'))
  with check (public.rajask_has_permission(realm_id, id, 'REALM', 'edit'));
create policy companies_delete on public.companies for delete to authenticated
  using (public.rajask_is_sovereign(realm_id));

-- titles ------------------------------------------------------------
create policy titles_select on public.titles for select to authenticated
  using (public.rajask_is_realm_member(realm_id));
create policy titles_write on public.titles for all to authenticated
  using (public.rajask_has_permission(realm_id, null, 'COURT', 'configure'))
  with check (public.rajask_has_permission(realm_id, null, 'COURT', 'configure'));

-- title_permissions -------------------------------------------------
create policy title_permissions_select on public.title_permissions for select to authenticated
  using (public.rajask_is_realm_member(realm_id));
create policy title_permissions_write on public.title_permissions for all to authenticated
  using (public.rajask_has_permission(realm_id, null, 'COURT', 'configure'))
  with check (public.rajask_has_permission(realm_id, null, 'COURT', 'configure'));

-- memberships -------------------------------------------------------
create policy memberships_select on public.memberships for select to authenticated
  using (
    user_id = auth.uid()
    or public.rajask_has_permission(realm_id, company_id, 'COURT', 'view')
  );
create policy memberships_write on public.memberships for all to authenticated
  using (public.rajask_has_permission(realm_id, company_id, 'COURT', 'admin'))
  with check (public.rajask_has_permission(realm_id, company_id, 'COURT', 'admin'));

-- permission_grants -------------------------------------------------
create policy permission_grants_select on public.permission_grants for select to authenticated
  using (public.rajask_has_permission(realm_id, null, 'COURT', 'view'));
create policy permission_grants_write on public.permission_grants for all to authenticated
  using (public.rajask_has_permission(realm_id, null, 'COURT', 'admin'))
  with check (public.rajask_has_permission(realm_id, null, 'COURT', 'admin'));

-- audit_events — read for WARD viewers; APPEND-ONLY (no update/delete policy)
create policy audit_select on public.audit_events for select to authenticated
  using (
    realm_id is not null
    and (public.rajask_is_sovereign(realm_id)
         or public.rajask_has_permission(realm_id, null, 'WARD', 'view'))
  );
create policy audit_insert on public.audit_events for insert to authenticated
  with check (realm_id is null or public.rajask_is_realm_member(realm_id));
-- NOTE: deliberately no UPDATE or DELETE policy ⇒ audit rows are immutable.

-- notifications -----------------------------------------------------
create policy notifications_select on public.notifications for select to authenticated
  using (recipient_user_id = auth.uid());
create policy notifications_update_own on public.notifications for update to authenticated
  using (recipient_user_id = auth.uid()) with check (recipient_user_id = auth.uid());
create policy notifications_insert on public.notifications for insert to authenticated
  with check (public.rajask_is_realm_member(realm_id));

-- attachments -------------------------------------------------------
create policy attachments_select on public.attachments for select to authenticated
  using (
    public.rajask_is_realm_member(realm_id)
    and (company_id is null or public.rajask_can_see_company(company_id))
  );
create policy attachments_write on public.attachments for all to authenticated
  using (public.rajask_is_realm_member(realm_id))
  with check (public.rajask_is_realm_member(realm_id));

-- ---------------------------------------------------------------------
-- Grants (future-proof against the 2026-10-30 public-schema grant flip).
-- RLS still gates every row; these only open the door to the policies.
-- ---------------------------------------------------------------------
grant usage on schema public to authenticated;
grant select, insert, update, delete on
  public.users, public.realms, public.companies, public.titles,
  public.title_permissions, public.memberships, public.permission_grants,
  public.notifications, public.attachments
  to authenticated;
grant select, insert on public.audit_events to authenticated;

grant execute on function
  public.rajask_is_realm_member(uuid),
  public.rajask_is_sovereign(uuid),
  public.rajask_shares_realm(uuid),
  public.rajask_has_permission(uuid, uuid, text, text),
  public.rajask_authority_limit(uuid, uuid, text, text),
  public.rajask_can_see_company(uuid)
  to authenticated;
