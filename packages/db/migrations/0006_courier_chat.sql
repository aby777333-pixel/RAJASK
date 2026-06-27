-- =====================================================================
-- RAJASK · Migration 0006 — COURIER chat (Phase 1)
-- ---------------------------------------------------------------------
-- DMs, group chats, and channels with threads, reactions, edit/recall,
-- read state, and Realtime. Default-deny RLS scoped to conversation
-- membership; audit on structural + message mutations (not every line).
-- =====================================================================

-- conversations -------------------------------------------------------
create table public.conversations (
  id              uuid primary key default gen_random_uuid(),
  realm_id        uuid not null references public.realms(id) on delete cascade,
  company_id      uuid references public.companies(id) on delete set null,
  kind            text not null default 'dm'
                    check (kind in ('dm','group','channel','broadcast')),
  name            text,                      -- null for DMs
  topic           text,
  created_by      uuid references public.users(id),
  is_archived     boolean not null default false,
  last_message_at timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create index conversations_realm_idx on public.conversations(realm_id, last_message_at desc);
comment on table public.conversations is 'COURIER threads: DMs, groups, channels, broadcasts.';

-- conversation_members ------------------------------------------------
create table public.conversation_members (
  id                 uuid primary key default gen_random_uuid(),
  realm_id           uuid not null references public.realms(id) on delete cascade,
  conversation_id    uuid not null references public.conversations(id) on delete cascade,
  user_id            uuid not null references public.users(id) on delete cascade,
  role               text not null default 'member' check (role in ('owner','member')),
  notifications_pref text not null default 'all' check (notifications_pref in ('all','mentions','none')),
  last_read_at       timestamptz,
  pinned             boolean not null default false,
  muted_until        timestamptz,
  joined_at          timestamptz not null default now(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (conversation_id, user_id)
);
create index conv_members_user_idx on public.conversation_members(user_id);
create index conv_members_conv_idx on public.conversation_members(conversation_id);
comment on table public.conversation_members is 'Membership + per-user state for a conversation.';

-- messages ------------------------------------------------------------
create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  realm_id        uuid not null references public.realms(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_user_id  uuid references public.users(id) on delete set null, -- null = system/external
  kind            text not null default 'text'
                    check (kind in ('text','voice','file','image','system')),
  body            text,
  reply_to_id     uuid references public.messages(id) on delete set null,
  edited_at       timestamptz,
  recalled_at     timestamptz,
  metadata        jsonb not null default '{}'::jsonb,  -- attachments, mentions, external source
  created_at      timestamptz not null default now()
);
create index messages_conv_idx on public.messages(conversation_id, created_at desc);
comment on table public.messages is 'COURIER messages; metadata carries mentions, attachments, external-channel provenance.';

-- message_reactions ---------------------------------------------------
create table public.message_reactions (
  id         uuid primary key default gen_random_uuid(),
  realm_id   uuid not null references public.realms(id) on delete cascade,
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id    uuid not null references public.users(id) on delete cascade,
  emoji      text not null,
  created_at timestamptz not null default now(),
  unique (message_id, user_id, emoji)
);
create index reactions_message_idx on public.message_reactions(message_id);
comment on table public.message_reactions is 'Emoji reactions on messages.';

-- ---------------------------------------------------------------------
-- Membership helper (SECURITY DEFINER — avoids RLS recursion)
-- ---------------------------------------------------------------------
create or replace function public.rajask_in_conversation(p_conv uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = p_conv and cm.user_id = auth.uid()
  );
$$;

-- updated_at + audit triggers
create trigger set_updated_at_conversations before update on public.conversations
  for each row execute function public.set_updated_at();
create trigger set_updated_at_conversation_members before update on public.conversation_members
  for each row execute function public.set_updated_at();

-- Audit structural changes fully; messages only on edit/recall/delete (not every line).
create trigger audit_conversations
  after insert or update or delete on public.conversations
  for each row execute function audit.log_change();
create trigger audit_conversation_members
  after insert or update or delete on public.conversation_members
  for each row execute function audit.log_change();
create trigger audit_messages_mutations
  after update or delete on public.messages
  for each row execute function audit.log_change();

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.conversations enable row level security;
alter table public.conversations force row level security;
alter table public.conversation_members enable row level security;
alter table public.conversation_members force row level security;
alter table public.messages enable row level security;
alter table public.messages force row level security;
alter table public.message_reactions enable row level security;
alter table public.message_reactions force row level security;

-- conversations: visible to members; creatable by COURIER:create holders.
create policy conversations_select on public.conversations for select to authenticated
  using (public.rajask_in_conversation(id));
create policy conversations_insert on public.conversations for insert to authenticated
  with check (
    created_by = auth.uid()
    and public.rajask_has_permission(realm_id, company_id, 'COURIER', 'create')
  );
create policy conversations_update on public.conversations for update to authenticated
  using (public.rajask_in_conversation(id))
  with check (public.rajask_in_conversation(id));

-- conversation_members: a user sees membership rows of conversations they're in;
-- can manage their own row; owners/COURIER admins manage others.
create policy conv_members_select on public.conversation_members for select to authenticated
  using (public.rajask_in_conversation(conversation_id));
create policy conv_members_insert on public.conversation_members for insert to authenticated
  with check (
    user_id = auth.uid()
    or public.rajask_in_conversation(conversation_id)
    or public.rajask_has_permission(realm_id, null, 'COURIER', 'admin')
  );
create policy conv_members_update_self on public.conversation_members for update to authenticated
  using (user_id = auth.uid() or public.rajask_has_permission(realm_id, null, 'COURIER', 'admin'))
  with check (user_id = auth.uid() or public.rajask_has_permission(realm_id, null, 'COURIER', 'admin'));
create policy conv_members_delete on public.conversation_members for delete to authenticated
  using (user_id = auth.uid() or public.rajask_has_permission(realm_id, null, 'COURIER', 'admin'));

-- messages: members read; members with COURIER:create post; sender edits/recalls.
create policy messages_select on public.messages for select to authenticated
  using (public.rajask_in_conversation(conversation_id));
create policy messages_insert on public.messages for insert to authenticated
  with check (
    sender_user_id = auth.uid()
    and public.rajask_in_conversation(conversation_id)
    and public.rajask_has_permission(realm_id, null, 'COURIER', 'create')
  );
create policy messages_update_own on public.messages for update to authenticated
  using (sender_user_id = auth.uid())
  with check (sender_user_id = auth.uid());

-- reactions: members react; manage own.
create policy reactions_select on public.message_reactions for select to authenticated
  using (public.rajask_in_conversation(
    (select conversation_id from public.messages m where m.id = message_id)
  ));
create policy reactions_write on public.message_reactions for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and public.rajask_in_conversation(
      (select conversation_id from public.messages m where m.id = message_id)
    )
  );

grant select, insert, update, delete on
  public.conversations, public.conversation_members,
  public.messages, public.message_reactions
  to authenticated;
revoke execute on function public.rajask_in_conversation(uuid) from public, anon;
grant execute on function public.rajask_in_conversation(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Find-or-create a 1:1 DM between the caller and another realm member.
-- SECURITY DEFINER so it can create the conversation + both member rows
-- atomically (the caller isn't yet a member at insert-check time).
-- ---------------------------------------------------------------------
create or replace function public.rajask_get_or_create_dm(p_realm uuid, p_other uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_conv uuid;
begin
  if v_me is null then raise exception 'not authenticated'; end if;
  if v_me = p_other then raise exception 'cannot DM yourself'; end if;
  if not public.rajask_is_realm_member(p_realm) then
    raise exception 'not a realm member';
  end if;

  -- Existing DM with exactly these two members?
  select c.id into v_conv
  from public.conversations c
  where c.realm_id = p_realm and c.kind = 'dm' and c.deleted_at is null
    and (select count(*) from public.conversation_members m where m.conversation_id = c.id) = 2
    and exists (select 1 from public.conversation_members m where m.conversation_id = c.id and m.user_id = v_me)
    and exists (select 1 from public.conversation_members m where m.conversation_id = c.id and m.user_id = p_other)
  limit 1;

  if v_conv is not null then return v_conv; end if;

  insert into public.conversations (realm_id, kind, created_by, last_message_at)
  values (p_realm, 'dm', v_me, now())
  returning id into v_conv;

  insert into public.conversation_members (realm_id, conversation_id, user_id, role)
  values (p_realm, v_conv, v_me, 'owner'), (p_realm, v_conv, p_other, 'member');

  return v_conv;
end;
$$;

revoke execute on function public.rajask_get_or_create_dm(uuid, uuid) from public, anon;
grant execute on function public.rajask_get_or_create_dm(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Bump conversation.last_message_at on new message (for inbox ordering).
-- ---------------------------------------------------------------------
create or replace function public.rajask_touch_conversation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end;
$$;
create trigger touch_conversation_on_message
  after insert on public.messages
  for each row execute function public.rajask_touch_conversation();

-- ---------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.message_reactions;
alter publication supabase_realtime add table public.conversation_members;
