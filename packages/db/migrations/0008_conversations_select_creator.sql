-- =====================================================================
-- RAJASK · Migration 0008 — let a conversation's creator read it
-- ---------------------------------------------------------------------
-- INSERT ... RETURNING on conversations needs the row to pass the SELECT
-- policy, but the creator isn't a member until the member row is added a
-- moment later. Allow `created_by = auth.uid()` so channel creation can
-- return its new id.
-- =====================================================================

drop policy conversations_select on public.conversations;
create policy conversations_select on public.conversations for select to authenticated
  using (public.rajask_in_conversation(id) or created_by = auth.uid());
