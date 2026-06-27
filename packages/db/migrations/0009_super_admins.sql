-- =====================================================================
-- RAJASK · Migration 0009 — Global super-admins (platform oversight)
-- ---------------------------------------------------------------------
-- A platform-level super-admin sits above any single realm (distinct from
-- the per-realm Sovereign). Additive only: existing users/policies are
-- untouched; super-admins simply gain a global allow in the resolver and
-- realm-membership visibility for WARD-style oversight.
-- =====================================================================

alter table public.users
  add column if not exists is_super_admin boolean not null default false;

-- Allowlist: emails that should be super-admins the moment they sign up.
create table if not exists public.super_admin_emails (
  email      text primary key,
  created_at timestamptz not null default now()
);
alter table public.super_admin_emails enable row level security;
alter table public.super_admin_emails force row level security;
-- No policies ⇒ only definer functions (handle_new_user) and service role read it.

insert into public.super_admin_emails (email) values
  ('rajkumar@ghlindiaventures.com'),
  ('aby777333@gmail.com')
on conflict (email) do nothing;

-- Flag any existing matching users now.
update public.users u
set is_super_admin = true
where lower(u.email) in (select lower(email) from public.super_admin_emails)
  and u.is_super_admin = false;

-- ---------------------------------------------------------------------
-- Recreate handle_new_user to also set is_super_admin from the allowlist
-- (preserves all prior behaviour).
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, full_name, avatar_url, is_super_admin)
  values (
    new.id, new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    exists (select 1 from public.super_admin_emails s where lower(s.email) = lower(new.email))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Super-admin predicate.
-- ---------------------------------------------------------------------
create or replace function public.rajask_is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select u.is_super_admin from public.users u where u.id = auth.uid()),
    false
  );
$$;
revoke execute on function public.rajask_is_super_admin() from public, anon;
grant execute on function public.rajask_is_super_admin() to authenticated;

-- ---------------------------------------------------------------------
-- Resolver: super-admins get a global allow (additive bypass at the top).
-- Body is otherwise byte-for-byte the existing logic.
-- ---------------------------------------------------------------------
create or replace function public.rajask_has_permission(
  p_realm uuid, p_company uuid, p_subsystem text, p_action text
) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  v_allow boolean := false;
  v_deny  boolean := false;
begin
  if auth.uid() is null then return false; end if;

  -- Platform super-admin: unrestricted everywhere.
  if public.rajask_is_super_admin() then
    return true;
  end if;

  if public.rajask_is_sovereign(p_realm) then
    return true;
  end if;

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

-- ---------------------------------------------------------------------
-- Realm visibility: super-admins may see any realm (oversight).
-- ---------------------------------------------------------------------
create or replace function public.rajask_is_realm_member(p_realm uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.rajask_is_super_admin() or exists (
    select 1 from public.memberships m
    where m.realm_id = p_realm
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.deleted_at is null
      and (m.starts_at is null or m.starts_at <= now())
      and (m.ends_at is null or m.ends_at > now())
  );
$$;
