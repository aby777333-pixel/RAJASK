-- =====================================================================
-- RAJASK · Migration 0010 — HERALD (broadcasts) + ALMANAC (calendar)
-- ---------------------------------------------------------------------
-- Phase 1 completion. Default-deny RLS + audit, consistent with prior.
-- =====================================================================

-- ============================ HERALD =================================
create table public.broadcasts (
  id           uuid primary key default gen_random_uuid(),
  realm_id     uuid not null references public.realms(id) on delete cascade,
  company_id   uuid references public.companies(id) on delete set null,
  created_by   uuid references public.users(id),
  title        text not null,
  body         text,
  segment      jsonb not null default '{"kind":"all"}'::jsonb, -- {kind:'all'|'title'|'tag'|'city', value?}
  channels     text[] not null default array['in_app']::text[],
  status       text not null default 'draft' check (status in ('draft','scheduled','sent')),
  scheduled_at timestamptz,
  sent_at      timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);
create index broadcasts_realm_idx on public.broadcasts(realm_id, created_at desc);

create table public.broadcast_receipts (
  id           uuid primary key default gen_random_uuid(),
  realm_id     uuid not null references public.realms(id) on delete cascade,
  broadcast_id uuid not null references public.broadcasts(id) on delete cascade,
  user_id      uuid not null references public.users(id) on delete cascade,
  channel      text not null default 'in_app',
  delivered_at timestamptz not null default now(),
  read_at      timestamptz,
  unique (broadcast_id, user_id)
);
create index broadcast_receipts_bc_idx on public.broadcast_receipts(broadcast_id);

create trigger set_updated_at_broadcasts before update on public.broadcasts
  for each row execute function public.set_updated_at();
create trigger audit_broadcasts after insert or update or delete on public.broadcasts
  for each row execute function audit.log_change();

alter table public.broadcasts enable row level security;
alter table public.broadcasts force row level security;
alter table public.broadcast_receipts enable row level security;
alter table public.broadcast_receipts force row level security;

create policy broadcasts_select on public.broadcasts for select to authenticated
  using (created_by = auth.uid() or public.rajask_has_permission(realm_id, company_id, 'HERALD', 'view'));
create policy broadcasts_insert on public.broadcasts for insert to authenticated
  with check (created_by = auth.uid() and public.rajask_has_permission(realm_id, company_id, 'HERALD', 'create'));
create policy broadcasts_update on public.broadcasts for update to authenticated
  using (created_by = auth.uid() or public.rajask_has_permission(realm_id, company_id, 'HERALD', 'edit'))
  with check (created_by = auth.uid() or public.rajask_has_permission(realm_id, company_id, 'HERALD', 'edit'));
create policy broadcasts_delete on public.broadcasts for delete to authenticated
  using (public.rajask_has_permission(realm_id, company_id, 'HERALD', 'delete'));

create policy receipts_select on public.broadcast_receipts for select to authenticated
  using (user_id = auth.uid() or public.rajask_has_permission(realm_id, null, 'HERALD', 'view'));
create policy receipts_update_self on public.broadcast_receipts for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on public.broadcasts to authenticated;
grant select, insert, update, delete on public.broadcast_receipts to authenticated;

-- Send a broadcast: fan out to the targeted segment as receipts + notifications.
create or replace function public.rajask_send_broadcast(p_broadcast uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_bc public.broadcasts;
  v_kind text;
  v_value text;
  v_count integer := 0;
begin
  select * into v_bc from public.broadcasts where id = p_broadcast;
  if not found then raise exception 'broadcast not found'; end if;
  if not public.rajask_has_permission(v_bc.realm_id, v_bc.company_id, 'HERALD', 'create') then
    raise exception 'not permitted';
  end if;

  v_kind := coalesce(v_bc.segment->>'kind', 'all');
  v_value := v_bc.segment->>'value';

  with recipients as (
    select distinct m.user_id
    from public.memberships m
    left join public.titles t on t.id = m.title_id
    where m.realm_id = v_bc.realm_id
      and m.status = 'active' and m.deleted_at is null
      and (
        v_kind = 'all'
        or (v_kind = 'title' and t.key = v_value)
      )
  ),
  ins_receipts as (
    insert into public.broadcast_receipts (realm_id, broadcast_id, user_id, channel)
    select v_bc.realm_id, v_bc.id, r.user_id, coalesce(v_bc.channels[1], 'in_app')
    from recipients r
    on conflict (broadcast_id, user_id) do nothing
    returning user_id
  ),
  ins_notifs as (
    insert into public.notifications (realm_id, recipient_user_id, subsystem, kind, title, body, priority, channel)
    select v_bc.realm_id, ir.user_id, 'HERALD', 'broadcast', v_bc.title, v_bc.body, 'high',
           coalesce(v_bc.channels[1], 'in_app')
    from ins_receipts ir
    returning 1
  )
  select count(*) into v_count from ins_notifs;

  update public.broadcasts set status = 'sent', sent_at = now() where id = v_bc.id;
  return v_count;
end;
$$;
revoke execute on function public.rajask_send_broadcast(uuid) from public, anon;
grant execute on function public.rajask_send_broadcast(uuid) to authenticated;

-- ============================ ALMANAC ================================
create table public.calendar_events (
  id            uuid primary key default gen_random_uuid(),
  realm_id      uuid not null references public.realms(id) on delete cascade,
  company_id    uuid references public.companies(id) on delete set null,
  owner_user_id uuid not null references public.users(id) on delete cascade,
  title         text not null,
  description   text,
  location      text,
  kind          text not null default 'meeting'
                  check (kind in ('meeting','personal','travel','board','company')),
  starts_at     timestamptz not null,
  ends_at       timestamptz,
  all_day       boolean not null default false,
  timezone      text not null default 'Asia/Kolkata',
  visibility    text not null default 'realm' check (visibility in ('private','realm','company')),
  metadata      jsonb not null default '{}'::jsonb, -- travel itinerary, etc.
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
create index calendar_events_realm_idx on public.calendar_events(realm_id, starts_at);

create table public.event_attendees (
  id        uuid primary key default gen_random_uuid(),
  realm_id  uuid not null references public.realms(id) on delete cascade,
  event_id  uuid not null references public.calendar_events(id) on delete cascade,
  user_id   uuid not null references public.users(id) on delete cascade,
  response  text not null default 'invited' check (response in ('invited','accepted','declined','tentative')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, user_id)
);
create index event_attendees_event_idx on public.event_attendees(event_id);

create trigger set_updated_at_calendar_events before update on public.calendar_events
  for each row execute function public.set_updated_at();
create trigger set_updated_at_event_attendees before update on public.event_attendees
  for each row execute function public.set_updated_at();
create trigger audit_calendar_events after insert or update or delete on public.calendar_events
  for each row execute function audit.log_change();

alter table public.calendar_events enable row level security;
alter table public.calendar_events force row level security;
alter table public.event_attendees enable row level security;
alter table public.event_attendees force row level security;

-- attendees policy first (events policy references it; keep it non-recursive)
create policy attendees_select on public.event_attendees for select to authenticated
  using (user_id = auth.uid() or public.rajask_has_permission(realm_id, null, 'ALMANAC', 'view'));
create policy attendees_write on public.event_attendees for all to authenticated
  using (user_id = auth.uid() or public.rajask_has_permission(realm_id, null, 'ALMANAC', 'edit'))
  with check (user_id = auth.uid() or public.rajask_has_permission(realm_id, null, 'ALMANAC', 'edit'));

create policy events_select on public.calendar_events for select to authenticated
  using (
    owner_user_id = auth.uid()
    or (visibility = 'realm' and public.rajask_has_permission(realm_id, company_id, 'ALMANAC', 'view'))
    or (visibility = 'company' and company_id is not null and public.rajask_can_see_company(company_id)
        and public.rajask_has_permission(realm_id, company_id, 'ALMANAC', 'view'))
    or exists (select 1 from public.event_attendees a where a.event_id = id and a.user_id = auth.uid())
  );
create policy events_insert on public.calendar_events for insert to authenticated
  with check (owner_user_id = auth.uid() and public.rajask_has_permission(realm_id, company_id, 'ALMANAC', 'create'));
create policy events_update on public.calendar_events for update to authenticated
  using (owner_user_id = auth.uid() or public.rajask_has_permission(realm_id, company_id, 'ALMANAC', 'edit'))
  with check (owner_user_id = auth.uid() or public.rajask_has_permission(realm_id, company_id, 'ALMANAC', 'edit'));
create policy events_delete on public.calendar_events for delete to authenticated
  using (owner_user_id = auth.uid() or public.rajask_has_permission(realm_id, company_id, 'ALMANAC', 'delete'));

grant select, insert, update, delete on public.calendar_events to authenticated;
grant select, insert, update, delete on public.event_attendees to authenticated;
