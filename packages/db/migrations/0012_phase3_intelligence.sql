-- =====================================================================
-- RAJASK · Migration 0012 — Phase 3 Intelligence
--   CHANCERY (reports) · CHRONICLE (engagement/pulse) · CODEX (decisions/risks)
--   TREASURY (financials) · VIZIER (AI chief of staff)
-- Default-deny RLS + audit. Money is NUMERIC (law #1).
-- =====================================================================

-- ============================ CHANCERY ===============================
create table public.reports (
  id           uuid primary key default gen_random_uuid(),
  realm_id     uuid not null references public.realms(id) on delete cascade,
  company_id   uuid references public.companies(id) on delete set null,
  created_by   uuid references public.users(id),
  title        text not null,
  kind         text not null default 'adhoc' check (kind in ('daily','weekly','monthly','quarterly','annual','adhoc')),
  format       text not null default 'dashboard' check (format in ('pdf','excel','csv','powerpoint','dashboard')),
  schedule     text,
  status       text not null default 'draft' check (status in ('draft','scheduled','generated')),
  content      jsonb not null default '{}'::jsonb,
  generated_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);
create index reports_realm_idx on public.reports(realm_id, created_at desc);

-- ============================ CHRONICLE ==============================
create table public.pulse_surveys (
  id         uuid primary key default gen_random_uuid(),
  realm_id   uuid not null references public.realms(id) on delete cascade,
  created_by uuid references public.users(id),
  question   text not null,
  kind       text not null default 'nps' check (kind in ('nps','satisfaction','custom')),
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.pulse_responses (
  id         uuid primary key default gen_random_uuid(),
  realm_id   uuid not null references public.realms(id) on delete cascade,
  survey_id  uuid not null references public.pulse_surveys(id) on delete cascade,
  user_id    uuid not null references public.users(id) on delete cascade,
  score      integer not null,
  comment    text,
  created_at timestamptz not null default now(),
  unique (survey_id, user_id)
);

-- ============================ CODEX ==================================
create table public.decisions (
  id               uuid primary key default gen_random_uuid(),
  realm_id         uuid not null references public.realms(id) on delete cascade,
  company_id       uuid references public.companies(id) on delete set null,
  created_by       uuid references public.users(id),
  owner_user_id    uuid references public.users(id),
  title            text not null,
  reasoning        text,
  alternatives     text,
  expected_outcome text,
  actual_outcome   text,
  status           text not null default 'open' check (status in ('open','closed')),
  decided_at       timestamptz,
  reviewed_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);
create index decisions_realm_idx on public.decisions(realm_id, created_at desc);

create table public.risks (
  id            uuid primary key default gen_random_uuid(),
  realm_id      uuid not null references public.realms(id) on delete cascade,
  company_id    uuid references public.companies(id) on delete set null,
  created_by    uuid references public.users(id),
  owner_user_id uuid references public.users(id),
  title         text not null,
  category      text not null default 'operational'
                  check (category in ('financial','legal','compliance','operational','cybersecurity','reputational')),
  likelihood    integer not null default 3 check (likelihood between 1 and 5),
  impact        integer not null default 3 check (impact between 1 and 5),
  mitigation    text,
  status        text not null default 'open' check (status in ('open','mitigating','closed')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
create index risks_realm_idx on public.risks(realm_id, status);

-- ============================ TREASURY ===============================
create table public.treasury_snapshots (
  id         uuid primary key default gen_random_uuid(),
  realm_id   uuid not null references public.realms(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  as_of      date not null default current_date,
  revenue    numeric,
  cash       numeric,
  expenses   numeric,
  currency   text not null default 'INR',
  source     text,
  created_at timestamptz not null default now()
);
create index treasury_snapshots_realm_idx on public.treasury_snapshots(realm_id, as_of desc);

create table public.expenses (
  id           uuid primary key default gen_random_uuid(),
  realm_id     uuid not null references public.realms(id) on delete cascade,
  company_id   uuid references public.companies(id) on delete set null,
  submitted_by uuid references public.users(id),
  amount       numeric not null,
  currency     text not null default 'INR',
  category     text,
  description  text,
  status       text not null default 'pending' check (status in ('pending','approved','reimbursed','rejected')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index expenses_realm_idx on public.expenses(realm_id, status);

-- ============================ VIZIER =================================
create table public.vizier_conversations (
  id         uuid primary key default gen_random_uuid(),
  realm_id   uuid not null references public.realms(id) on delete cascade,
  user_id    uuid not null references public.users(id) on delete cascade,
  title      text not null default 'New conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.vizier_messages (
  id              uuid primary key default gen_random_uuid(),
  realm_id        uuid not null references public.realms(id) on delete cascade,
  conversation_id uuid not null references public.vizier_conversations(id) on delete cascade,
  user_id         uuid not null references public.users(id) on delete cascade,
  role            text not null check (role in ('user','assistant','tool')),
  content         text not null,
  created_at      timestamptz not null default now()
);
create index vizier_messages_conv_idx on public.vizier_messages(conversation_id, created_at);

-- ---------------------------------------------------------------------
-- updated_at + audit triggers
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'reports','pulse_surveys','decisions','risks','expenses','vizier_conversations'
  ] loop
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at();','set_updated_at_'||t,t);
  end loop;
  foreach t in array array['reports','decisions','risks','expenses'] loop
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function audit.log_change();','audit_'||t,t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Enable + FORCE RLS + grants
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'reports','pulse_surveys','pulse_responses','decisions','risks',
    'treasury_snapshots','expenses','vizier_conversations','vizier_messages'
  ] loop
    execute format('alter table public.%I enable row level security;',t);
    execute format('alter table public.%I force row level security;',t);
    execute format('grant select, insert, update, delete on public.%I to authenticated;',t);
  end loop;
end $$;

-- CHANCERY
create policy reports_select on public.reports for select to authenticated
  using (created_by = auth.uid() or public.rajask_has_permission(realm_id, company_id, 'CHANCERY', 'view'));
create policy reports_write on public.reports for all to authenticated
  using (created_by = auth.uid() or public.rajask_has_permission(realm_id, company_id, 'CHANCERY', 'edit'))
  with check (created_by = auth.uid() or public.rajask_has_permission(realm_id, company_id, 'CHANCERY', 'create'));

-- CHRONICLE
create policy surveys_select on public.pulse_surveys for select to authenticated
  using (public.rajask_is_realm_member(realm_id));
create policy surveys_write on public.pulse_surveys for all to authenticated
  using (public.rajask_has_permission(realm_id, null, 'CHRONICLE', 'edit'))
  with check (public.rajask_has_permission(realm_id, null, 'CHRONICLE', 'edit'));
create policy responses_select on public.pulse_responses for select to authenticated
  using (user_id = auth.uid() or public.rajask_has_permission(realm_id, null, 'CHRONICLE', 'view'));
create policy responses_insert on public.pulse_responses for insert to authenticated
  with check (user_id = auth.uid() and public.rajask_is_realm_member(realm_id));

-- CODEX
create policy decisions_select on public.decisions for select to authenticated
  using (public.rajask_has_permission(realm_id, company_id, 'CODEX', 'view'));
create policy decisions_write on public.decisions for all to authenticated
  using (public.rajask_has_permission(realm_id, company_id, 'CODEX', 'edit'))
  with check (public.rajask_has_permission(realm_id, company_id, 'CODEX', 'create'));
create policy risks_select on public.risks for select to authenticated
  using (public.rajask_has_permission(realm_id, company_id, 'CODEX', 'view'));
create policy risks_write on public.risks for all to authenticated
  using (public.rajask_has_permission(realm_id, company_id, 'CODEX', 'edit'))
  with check (public.rajask_has_permission(realm_id, company_id, 'CODEX', 'create'));

-- TREASURY
create policy treasury_select on public.treasury_snapshots for select to authenticated
  using (public.rajask_has_permission(realm_id, company_id, 'TREASURY', 'view'));
create policy treasury_write on public.treasury_snapshots for all to authenticated
  using (public.rajask_has_permission(realm_id, company_id, 'TREASURY', 'edit'))
  with check (public.rajask_has_permission(realm_id, company_id, 'TREASURY', 'create'));
create policy expenses_select on public.expenses for select to authenticated
  using (submitted_by = auth.uid() or public.rajask_has_permission(realm_id, company_id, 'TREASURY', 'view'));
create policy expenses_insert on public.expenses for insert to authenticated
  with check (submitted_by = auth.uid() and public.rajask_is_realm_member(realm_id));
create policy expenses_update on public.expenses for update to authenticated
  using (public.rajask_has_permission(realm_id, company_id, 'TREASURY', 'edit'))
  with check (public.rajask_has_permission(realm_id, company_id, 'TREASURY', 'edit'));

-- VIZIER (owner-only)
create policy vizier_conv_all on public.vizier_conversations for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy vizier_msg_all on public.vizier_messages for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
