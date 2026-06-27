-- =====================================================================
-- RAJASK · Migration 0003 — Realm bootstrap + default permission matrix
-- ---------------------------------------------------------------------
-- §10: the permission matrix is DATA. `rajask_create_realm` seeds the
-- standard title templates, expands their default matrix, and invests the
-- caller as Sovereign — all in one audited, SECURITY DEFINER call. The
-- Sovereign may then override any cell.
-- =====================================================================

-- Expand an action "bundle" into individual actions.
create or replace function public.rajask_bundle_actions(p_bundle text)
returns setof text language sql immutable as $$
  select unnest(case p_bundle
    when 'view'       then array['view']
    when 'engage'     then array['view','create']
    when 'review'     then array['view','export']
    when 'contribute' then array['view','create','edit','export']
    when 'manage'     then array['view','create','edit','delete','export','approve']
    when 'full'       then array['view','create','edit','delete','approve','export','configure','admin']
    else array[]::text[]
  end);
$$;

-- Bootstrap a realm and invest the caller as Sovereign.
create or replace function public.rajask_create_realm(p_name text, p_slug text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid := auth.uid();
  v_realm uuid;
  v_sovereign_title uuid;
  r record;
begin
  if v_owner is null then
    raise exception 'rajask_create_realm: not authenticated';
  end if;

  -- Ensure the owner has a profile row (normally created by the auth trigger).
  insert into public.users (id, email)
  select v_owner, (select email from auth.users where id = v_owner)
  on conflict (id) do nothing;

  insert into public.realms (name, slug, owner_user_id)
  values (p_name, p_slug, v_owner)
  returning id into v_realm;

  -- 1) Seed all system title templates for this realm.
  insert into public.titles (realm_id, key, name, is_system)
  select v_realm, k.key, k.name, true
  from (values
    ('SOVEREIGN','Sovereign (CEO)'),
    ('CHAIRMAN','Chairman'),
    ('DIRECTOR','Director'),
    ('EXECUTIVE','Executive'),
    ('MANAGER','Manager'),
    ('DEPARTMENT_HEAD','Department Head'),
    ('TEAM_LEAD','Team Lead'),
    ('EMPLOYEE','Employee'),
    ('PA_SECRETARY','PA / Secretary'),
    ('CONTRACTOR','Contractor'),
    ('CONSULTANT','Consultant'),
    ('FREELANCER','Freelancer'),
    ('VENDOR','Vendor'),
    ('SUPPLIER','Supplier'),
    ('LAWYER','Lawyer'),
    ('AUDITOR','Auditor'),
    ('INVESTOR','Investor'),
    ('BOARD_MEMBER','Board Member'),
    ('ADVISOR','Advisor'),
    ('CLIENT','Client'),
    ('GUEST','Guest'),
    ('BROKER','Broker'),
    ('REAL_ESTATE_BROKER','Real-Estate Broker'),
    ('BUYER','Buyer'),
    ('SELLER','Seller'),
    ('AGENT','Agent'),
    ('PROPERTY_DEVELOPER','Property Developer'),
    ('AFFILIATE','Affiliate'),
    ('INTRODUCING_BROKER','Introducing Broker'),
    ('CHANNEL_PARTNER','Channel Partner'),
    ('PARTNER_COMPANY','Partner Company'),
    ('AGENCY','Agency'),
    ('SERVICE_PROVIDER','Service Provider')
  ) as k(key, name);

  select id into v_sovereign_title
  from public.titles where realm_id = v_realm and key = 'SOVEREIGN';

  -- 2) SOVEREIGN: full rights on every subsystem.
  insert into public.title_permissions (realm_id, title_id, subsystem, action, allowed)
  select v_realm, v_sovereign_title, s.subsystem, a.action, true
  from unnest(array[
    'THRONE','VIZIER','REALM','COURIER','COUNCIL','HERALD','WRIT','SEAL',
    'EDICT','ALMANAC','VAULT','CHANCERY','CHRONICLE','CODEX','TREASURY',
    'PRIVY','CONDUIT','COURT','WARD'
  ]) as s(subsystem)
  cross join unnest(array['view','create','edit','delete','approve','export','configure','admin']) as a(action);

  -- 3) Default matrix for all other templates, expressed as (templates, subsystem, bundle).
  --    Unlisted (template, subsystem) pairs ⇒ no access (default-deny).
  insert into public.title_permissions (realm_id, title_id, subsystem, action, allowed)
  select v_realm, t.id, d.subsystem, act, true
  from (
    -- Leadership: Chairman / Director / Executive
    select unnest(array['CHAIRMAN','DIRECTOR','EXECUTIVE']) as template, subsystem, bundle
    from (values
      ('THRONE','view'),('VIZIER','contribute'),('REALM','review'),('COURIER','manage'),
      ('COUNCIL','manage'),('HERALD','contribute'),('WRIT','manage'),('SEAL','manage'),
      ('EDICT','view'),('ALMANAC','manage'),('VAULT','contribute'),('CHANCERY','manage'),
      ('CHRONICLE','review'),('CODEX','contribute'),('TREASURY','review'),('CONDUIT','view'),
      ('COURT','view')
    ) as m(subsystem,bundle)
    union all
    -- Middle management: Manager / Department Head
    select unnest(array['MANAGER','DEPARTMENT_HEAD']), subsystem, bundle
    from (values
      ('THRONE','view'),('VIZIER','contribute'),('COURIER','contribute'),('COUNCIL','contribute'),
      ('HERALD','contribute'),('WRIT','manage'),('SEAL','view'),('ALMANAC','contribute'),
      ('VAULT','contribute'),('CHANCERY','contribute'),('CHRONICLE','review'),('CODEX','contribute'),
      ('COURT','view')
    ) as m(subsystem,bundle)
    union all
    -- Team Lead
    select 'TEAM_LEAD', subsystem, bundle
    from (values
      ('THRONE','view'),('VIZIER','view'),('COURIER','contribute'),('COUNCIL','contribute'),
      ('WRIT','contribute'),('ALMANAC','contribute'),('CHANCERY','contribute'),('CHRONICLE','view')
    ) as m(subsystem,bundle)
    union all
    -- Employee
    select 'EMPLOYEE', subsystem, bundle
    from (values
      ('THRONE','view'),('VIZIER','view'),('COURIER','contribute'),('WRIT','contribute'),
      ('ALMANAC','view'),('COUNCIL','view'),('CHANCERY','view'),('VAULT','view')
    ) as m(subsystem,bundle)
    union all
    -- PA / Secretary
    select 'PA_SECRETARY', subsystem, bundle
    from (values
      ('THRONE','view'),('VIZIER','contribute'),('COURIER','manage'),('COUNCIL','manage'),
      ('ALMANAC','manage'),('HERALD','contribute'),('WRIT','contribute'),('VAULT','contribute'),
      ('CHANCERY','view'),('COURT','view')
    ) as m(subsystem,bundle)
    union all
    -- Governance: Board Member / Investor
    select unnest(array['BOARD_MEMBER','INVESTOR']), subsystem, bundle
    from (values
      ('COUNCIL','contribute'),('CHANCERY','review'),('CHRONICLE','review'),('TREASURY','review'),
      ('CODEX','view'),('VAULT','view'),('COURIER','contribute')
    ) as m(subsystem,bundle)
    union all
    -- Auditor (assurance, read + export)
    select 'AUDITOR', subsystem, bundle
    from (values
      ('WARD','review'),('CHANCERY','review'),('TREASURY','review'),('CODEX','review'),
      ('VAULT','view'),('COURIER','view')
    ) as m(subsystem,bundle)
    union all
    -- Lawyer
    select 'LAWYER', subsystem, bundle
    from (values
      ('VAULT','manage'),('CODEX','contribute'),('COURIER','contribute'),('CHANCERY','view'),
      ('COUNCIL','view')
    ) as m(subsystem,bundle)
    union all
    -- Advisor / Consultant
    select unnest(array['ADVISOR','CONSULTANT']), subsystem, bundle
    from (values
      ('VIZIER','view'),('COURIER','contribute'),('COUNCIL','contribute'),('WRIT','contribute'),
      ('CHANCERY','view'),('CHRONICLE','view'),('VAULT','view')
    ) as m(subsystem,bundle)
    union all
    -- External contributors + industry roles
    select unnest(array[
      'CONTRACTOR','FREELANCER','AGENCY','SERVICE_PROVIDER','PARTNER_COMPANY',
      'CHANNEL_PARTNER','AFFILIATE','INTRODUCING_BROKER','BROKER',
      'REAL_ESTATE_BROKER','AGENT','PROPERTY_DEVELOPER'
    ]), subsystem, bundle
    from (values
      ('COURIER','contribute'),('WRIT','contribute'),('ALMANAC','view'),
      ('CHANCERY','view'),('VAULT','view'),('COUNCIL','view')
    ) as m(subsystem,bundle)
    union all
    -- Commercial counterparties
    select unnest(array['VENDOR','SUPPLIER','BUYER','SELLER','CLIENT']), subsystem, bundle
    from (values
      ('COURIER','contribute'),('WRIT','view'),('CHANCERY','view'),('ALMANAC','view'),
      ('VAULT','view')
    ) as m(subsystem,bundle)
    union all
    -- Guest: message only
    select 'GUEST', subsystem, bundle
    from (values ('COURIER','engage')) as m(subsystem,bundle)
  ) as d
  join public.titles t on t.realm_id = v_realm and t.key = d.template
  cross join lateral public.rajask_bundle_actions(d.bundle) as act;

  -- 4) Invest the caller as Sovereign (realm-scoped).
  insert into public.memberships (realm_id, company_id, user_id, title_id, scope, status, is_sovereign, starts_at)
  values (v_realm, null, v_owner, v_sovereign_title, 'realm', 'active', true, now());

  return v_realm;
end;
$$;

grant execute on function public.rajask_bundle_actions(text) to authenticated;
grant execute on function public.rajask_create_realm(text, text) to authenticated;
