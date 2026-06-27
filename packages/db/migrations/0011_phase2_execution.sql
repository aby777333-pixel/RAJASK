-- =====================================================================
-- RAJASK · Migration 0011 — Phase 2 Execution
--   WRIT (delegation) · SEAL (approvals/DOA) · COUNCIL (meetings) ·
--   VAULT (documents/e-sign) · EDICT (automation rules)
-- Default-deny RLS + audit throughout. Money is NUMERIC (law #1).
-- =====================================================================

-- ============================ WRIT ===================================
create table public.tasks (
  id               uuid primary key default gen_random_uuid(),
  realm_id         uuid not null references public.realms(id) on delete cascade,
  company_id       uuid references public.companies(id) on delete set null,
  created_by       uuid references public.users(id),
  assignee_user_id uuid references public.users(id) on delete set null,
  title            text not null,
  brief            text,
  priority         text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  status           text not null default 'draft'
                     check (status in ('draft','assigned','accepted','in_progress','awaiting_review','awaiting_approval','completed','blocked','escalated','cancelled')),
  due_at           timestamptz,
  budget_amount    numeric,
  budget_currency  text,
  parent_task_id   uuid references public.tasks(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);
create index tasks_realm_idx on public.tasks(realm_id, status);
create index tasks_assignee_idx on public.tasks(assignee_user_id);

create table public.task_comments (
  id             uuid primary key default gen_random_uuid(),
  realm_id       uuid not null references public.realms(id) on delete cascade,
  task_id        uuid not null references public.tasks(id) on delete cascade,
  author_user_id uuid references public.users(id),
  body           text not null,
  created_at     timestamptz not null default now()
);
create index task_comments_task_idx on public.task_comments(task_id);

-- ============================ SEAL ===================================
create table public.approval_requests (
  id           uuid primary key default gen_random_uuid(),
  realm_id     uuid not null references public.realms(id) on delete cascade,
  company_id   uuid references public.companies(id) on delete set null,
  requested_by uuid references public.users(id),
  kind         text not null default 'other'
                 check (kind in ('payment','purchase','contract','discount','hiring','budget','leave','vendor','capex','other')),
  title        text not null,
  detail       text,
  amount       numeric,
  currency     text default 'INR',
  status       text not null default 'pending' check (status in ('pending','approved','rejected','cancelled','escalated')),
  decided_by   uuid references public.users(id),
  decided_at   timestamptz,
  reason       text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index approvals_realm_idx on public.approval_requests(realm_id, status);

-- ============================ COUNCIL ================================
create table public.meetings (
  id            uuid primary key default gen_random_uuid(),
  realm_id      uuid not null references public.realms(id) on delete cascade,
  company_id    uuid references public.companies(id) on delete set null,
  created_by    uuid references public.users(id),
  title         text not null,
  agenda        text,
  starts_at     timestamptz not null,
  ends_at       timestamptz,
  location      text,
  status        text not null default 'scheduled' check (status in ('scheduled','in_progress','completed','cancelled')),
  recording_url text,
  minutes       text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
create index meetings_realm_idx on public.meetings(realm_id, starts_at);

create table public.meeting_attendees (
  id         uuid primary key default gen_random_uuid(),
  realm_id   uuid not null references public.realms(id) on delete cascade,
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  user_id    uuid not null references public.users(id) on delete cascade,
  role       text not null default 'attendee' check (role in ('host','attendee')),
  response   text not null default 'invited' check (response in ('invited','accepted','declined','tentative')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (meeting_id, user_id)
);
create index meeting_attendees_meeting_idx on public.meeting_attendees(meeting_id);

-- ============================ VAULT ==================================
create table public.documents (
  id            uuid primary key default gen_random_uuid(),
  realm_id      uuid not null references public.realms(id) on delete cascade,
  company_id    uuid references public.companies(id) on delete set null,
  owner_user_id uuid references public.users(id),
  title         text not null,
  category      text not null default 'other'
                  check (category in ('contract','sop','policy','board_pack','legal','financial','deck','other')),
  storage_bucket text,
  storage_path   text,
  content_type   text,
  byte_size      bigint,
  version       integer not null default 1,
  status        text not null default 'active' check (status in ('draft','active','archived')),
  expires_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
create index documents_realm_idx on public.documents(realm_id, category);

create table public.document_signatures (
  id             uuid primary key default gen_random_uuid(),
  realm_id       uuid not null references public.realms(id) on delete cascade,
  document_id    uuid not null references public.documents(id) on delete cascade,
  signer_user_id uuid not null references public.users(id) on delete cascade,
  status         text not null default 'pending' check (status in ('pending','signed','declined')),
  signed_at      timestamptz,
  signature_meta jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (document_id, signer_user_id)
);
create index doc_sigs_document_idx on public.document_signatures(document_id);

-- ============================ EDICT ==================================
create table public.automation_rules (
  id            uuid primary key default gen_random_uuid(),
  realm_id      uuid not null references public.realms(id) on delete cascade,
  company_id    uuid references public.companies(id) on delete set null,
  created_by    uuid references public.users(id),
  name          text not null,
  description   text,
  trigger       jsonb not null default '{}'::jsonb,
  conditions    jsonb not null default '[]'::jsonb,
  actions       jsonb not null default '[]'::jsonb,
  enabled       boolean not null default true,
  last_fired_at timestamptz,
  fire_count    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
create index automation_rules_realm_idx on public.automation_rules(realm_id);

create table public.automation_runs (
  id         uuid primary key default gen_random_uuid(),
  realm_id   uuid not null references public.realms(id) on delete cascade,
  rule_id    uuid not null references public.automation_rules(id) on delete cascade,
  status     text not null default 'success' check (status in ('success','failed','dry_run')),
  detail     jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index automation_runs_rule_idx on public.automation_runs(rule_id, created_at desc);

-- ---------------------------------------------------------------------
-- updated_at + audit triggers
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'tasks','approval_requests','meetings','meeting_attendees',
    'documents','document_signatures','automation_rules'
  ] loop
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at();','set_updated_at_'||t,t);
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function audit.log_change();','audit_'||t,t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Enable + FORCE RLS
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'tasks','task_comments','approval_requests','meetings','meeting_attendees',
    'documents','document_signatures','automation_rules','automation_runs'
  ] loop
    execute format('alter table public.%I enable row level security;',t);
    execute format('alter table public.%I force row level security;',t);
    execute format('grant select, insert, update, delete on public.%I to authenticated;',t);
  end loop;
end $$;

-- WRIT policies -------------------------------------------------------
create policy tasks_select on public.tasks for select to authenticated
  using (created_by = auth.uid() or assignee_user_id = auth.uid()
         or public.rajask_has_permission(realm_id, company_id, 'WRIT', 'view'));
create policy tasks_insert on public.tasks for insert to authenticated
  with check (created_by = auth.uid() and public.rajask_has_permission(realm_id, company_id, 'WRIT', 'create'));
create policy tasks_update on public.tasks for update to authenticated
  using (created_by = auth.uid() or assignee_user_id = auth.uid()
         or public.rajask_has_permission(realm_id, company_id, 'WRIT', 'edit'))
  with check (created_by = auth.uid() or assignee_user_id = auth.uid()
         or public.rajask_has_permission(realm_id, company_id, 'WRIT', 'edit'));
create policy tasks_delete on public.tasks for delete to authenticated
  using (public.rajask_has_permission(realm_id, company_id, 'WRIT', 'delete'));

create policy task_comments_select on public.task_comments for select to authenticated
  using (public.rajask_has_permission(realm_id, null, 'WRIT', 'view')
         or exists (select 1 from public.tasks t where t.id = task_id
                    and (t.created_by = auth.uid() or t.assignee_user_id = auth.uid())));
create policy task_comments_insert on public.task_comments for insert to authenticated
  with check (author_user_id = auth.uid()
         and (public.rajask_has_permission(realm_id, null, 'WRIT', 'view')
              or exists (select 1 from public.tasks t where t.id = task_id
                         and (t.created_by = auth.uid() or t.assignee_user_id = auth.uid()))));

-- SEAL policies -------------------------------------------------------
create policy approvals_select on public.approval_requests for select to authenticated
  using (requested_by = auth.uid() or public.rajask_has_permission(realm_id, company_id, 'SEAL', 'view'));
create policy approvals_insert on public.approval_requests for insert to authenticated
  with check (requested_by = auth.uid() and public.rajask_has_permission(realm_id, company_id, 'SEAL', 'create'));
create policy approvals_update on public.approval_requests for update to authenticated
  using (public.rajask_has_permission(realm_id, company_id, 'SEAL', 'approve') or requested_by = auth.uid())
  with check (public.rajask_has_permission(realm_id, company_id, 'SEAL', 'approve') or requested_by = auth.uid());

-- COUNCIL policies ----------------------------------------------------
create policy m_attendees_select on public.meeting_attendees for select to authenticated
  using (user_id = auth.uid() or public.rajask_has_permission(realm_id, null, 'COUNCIL', 'view'));
create policy m_attendees_write on public.meeting_attendees for all to authenticated
  using (user_id = auth.uid() or public.rajask_has_permission(realm_id, null, 'COUNCIL', 'edit'))
  with check (user_id = auth.uid() or public.rajask_has_permission(realm_id, null, 'COUNCIL', 'edit'));

create policy meetings_select on public.meetings for select to authenticated
  using (created_by = auth.uid()
         or public.rajask_has_permission(realm_id, company_id, 'COUNCIL', 'view')
         or exists (select 1 from public.meeting_attendees a where a.meeting_id = id and a.user_id = auth.uid()));
create policy meetings_insert on public.meetings for insert to authenticated
  with check (created_by = auth.uid() and public.rajask_has_permission(realm_id, company_id, 'COUNCIL', 'create'));
create policy meetings_update on public.meetings for update to authenticated
  using (created_by = auth.uid() or public.rajask_has_permission(realm_id, company_id, 'COUNCIL', 'edit'))
  with check (created_by = auth.uid() or public.rajask_has_permission(realm_id, company_id, 'COUNCIL', 'edit'));
create policy meetings_delete on public.meetings for delete to authenticated
  using (created_by = auth.uid() or public.rajask_has_permission(realm_id, company_id, 'COUNCIL', 'delete'));

-- VAULT policies ------------------------------------------------------
create policy doc_sigs_select on public.document_signatures for select to authenticated
  using (signer_user_id = auth.uid() or public.rajask_has_permission(realm_id, null, 'VAULT', 'view'));
create policy doc_sigs_write on public.document_signatures for all to authenticated
  using (signer_user_id = auth.uid() or public.rajask_has_permission(realm_id, null, 'VAULT', 'edit'))
  with check (signer_user_id = auth.uid() or public.rajask_has_permission(realm_id, null, 'VAULT', 'edit'));

create policy documents_select on public.documents for select to authenticated
  using (owner_user_id = auth.uid()
         or (public.rajask_has_permission(realm_id, company_id, 'VAULT', 'view')
             and (company_id is null or public.rajask_can_see_company(company_id)))
         or exists (select 1 from public.document_signatures s where s.document_id = id and s.signer_user_id = auth.uid()));
create policy documents_insert on public.documents for insert to authenticated
  with check (owner_user_id = auth.uid() and public.rajask_has_permission(realm_id, company_id, 'VAULT', 'create'));
create policy documents_update on public.documents for update to authenticated
  using (owner_user_id = auth.uid() or public.rajask_has_permission(realm_id, company_id, 'VAULT', 'edit'))
  with check (owner_user_id = auth.uid() or public.rajask_has_permission(realm_id, company_id, 'VAULT', 'edit'));
create policy documents_delete on public.documents for delete to authenticated
  using (owner_user_id = auth.uid() or public.rajask_has_permission(realm_id, company_id, 'VAULT', 'delete'));

-- EDICT policies ------------------------------------------------------
create policy rules_select on public.automation_rules for select to authenticated
  using (public.rajask_has_permission(realm_id, company_id, 'EDICT', 'view'));
create policy rules_write on public.automation_rules for all to authenticated
  using (public.rajask_has_permission(realm_id, company_id, 'EDICT', 'edit'))
  with check (public.rajask_has_permission(realm_id, company_id, 'EDICT', 'edit')
              and (created_by = auth.uid() or public.rajask_has_permission(realm_id, company_id, 'EDICT', 'admin')));
create policy runs_select on public.automation_runs for select to authenticated
  using (public.rajask_has_permission(realm_id, null, 'EDICT', 'view'));
create policy runs_insert on public.automation_runs for insert to authenticated
  with check (public.rajask_has_permission(realm_id, null, 'EDICT', 'edit'));
