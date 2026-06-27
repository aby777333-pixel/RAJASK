-- =====================================================================
-- RAJASK · Migration 0005 — COURT invitations (Phase 1)
-- ---------------------------------------------------------------------
-- Admitting people to the court: branded, expiring, revocable invites
-- with a status pipeline (sent → opened → accepted → activated). Default
-- -deny RLS + audit, consistent with the foundation.
-- =====================================================================

create table public.invitations (
  id          uuid primary key default gen_random_uuid(),
  realm_id    uuid not null references public.realms(id) on delete cascade,
  company_id  uuid references public.companies(id) on delete cascade,
  title_id    uuid not null references public.titles(id),
  scope       text not null default 'company' check (scope in ('realm','company')),
  email       text,
  phone       text,
  channel     text not null default 'email' check (channel in ('email','sms','whatsapp','link')),
  token       uuid not null unique default gen_random_uuid(),
  note        text,                       -- branded personal note
  status      text not null default 'sent'
                check (status in ('sent','opened','accepted','activated','revoked','expired')),
  invited_by  uuid references public.users(id),
  accepted_by uuid references public.users(id),
  expires_at  timestamptz not null default (now() + interval '14 days'),
  opened_at   timestamptz,
  accepted_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index invitations_realm_idx on public.invitations(realm_id);
create index invitations_token_idx on public.invitations(token);
comment on table public.invitations is 'Court invitations with branded, expiring, revocable links.';

-- updated_at + audit triggers (mirrors the foundation pattern).
create trigger set_updated_at_invitations
  before update on public.invitations
  for each row execute function public.set_updated_at();
create trigger audit_invitations
  after insert or update or delete on public.invitations
  for each row execute function audit.log_change();

alter table public.invitations enable row level security;
alter table public.invitations force row level security;

-- Court managers (COURT:view/admin) see and manage invitations in scope.
create policy invitations_select on public.invitations for select to authenticated
  using (public.rajask_has_permission(realm_id, company_id, 'COURT', 'view'));
create policy invitations_insert on public.invitations for insert to authenticated
  with check (
    public.rajask_has_permission(realm_id, company_id, 'COURT', 'admin')
    and invited_by = auth.uid()
  );
create policy invitations_update on public.invitations for update to authenticated
  using (public.rajask_has_permission(realm_id, company_id, 'COURT', 'admin'))
  with check (public.rajask_has_permission(realm_id, company_id, 'COURT', 'admin'));
create policy invitations_delete on public.invitations for delete to authenticated
  using (public.rajask_has_permission(realm_id, company_id, 'COURT', 'admin'));

grant select, insert, update, delete on public.invitations to authenticated;

-- ---------------------------------------------------------------------
-- Look up an invitation by token (invitee may not yet be a court member).
-- Returns safe, non-PII-leaking fields and marks it opened.
-- ---------------------------------------------------------------------
create or replace function public.rajask_open_invitation(p_token uuid)
returns table (
  realm_name text,
  title_name text,
  status text,
  expired boolean
)
language plpgsql security definer set search_path = public as $$
declare v_inv public.invitations;
begin
  select * into v_inv from public.invitations where token = p_token;
  if not found then
    return; -- no rows
  end if;

  if v_inv.status = 'sent' then
    update public.invitations
      set status = 'opened', opened_at = now()
      where id = v_inv.id;
  end if;

  return query
  select
    r.name,
    t.name,
    v_inv.status,
    (v_inv.expires_at <= now())
  from public.realms r
  join public.titles t on t.id = v_inv.title_id
  where r.id = v_inv.realm_id;
end;
$$;

-- ---------------------------------------------------------------------
-- Accept an invitation: the authenticated caller joins the court with the
-- invited title. SECURITY DEFINER because the invitee is not yet a member
-- (and so cannot satisfy the COURT:admin membership-write policy).
-- ---------------------------------------------------------------------
create or replace function public.rajask_accept_invitation(p_token uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_inv public.invitations;
begin
  if v_user is null then
    raise exception 'rajask_accept_invitation: not authenticated';
  end if;

  select * into v_inv from public.invitations where token = p_token for update;
  if not found then
    raise exception 'invitation not found';
  end if;
  if v_inv.status in ('revoked','expired') then
    raise exception 'invitation is no longer valid';
  end if;
  if v_inv.expires_at <= now() then
    update public.invitations set status = 'expired' where id = v_inv.id;
    raise exception 'invitation has expired';
  end if;

  -- Ensure a profile row exists.
  insert into public.users (id, email)
  select v_user, (select email from auth.users where id = v_user)
  on conflict (id) do nothing;

  -- Admit to the court (idempotent on the membership unique key).
  insert into public.memberships
    (realm_id, company_id, user_id, title_id, scope, status, starts_at)
  values
    (v_inv.realm_id, v_inv.company_id, v_user, v_inv.title_id, v_inv.scope, 'active', now())
  on conflict (realm_id, company_id, user_id, title_id) do nothing;

  update public.invitations
    set status = 'activated', accepted_by = v_user, accepted_at = now()
    where id = v_inv.id;

  return v_inv.realm_id;
end;
$$;

revoke execute on function public.rajask_open_invitation(uuid) from public, anon;
revoke execute on function public.rajask_accept_invitation(uuid) from public, anon;
grant execute on function public.rajask_open_invitation(uuid) to authenticated;
grant execute on function public.rajask_accept_invitation(uuid) to authenticated;
