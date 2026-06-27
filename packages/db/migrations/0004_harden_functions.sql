-- =====================================================================
-- RAJASK · Migration 0004 — Function hardening (WARD / least privilege)
-- ---------------------------------------------------------------------
-- 1) Pin search_path on the two remaining mutable functions.
-- 2) Revoke EXECUTE from anon/public on every function. Trigger functions
--    run under the trigger mechanism regardless of grants, and resolver
--    helpers are only ever needed by the `authenticated` role.
-- =====================================================================

-- 1) Pin search_path.
alter function public.set_updated_at() set search_path = public;
alter function public.rajask_bundle_actions(text) set search_path = public;

-- 2) Lock down execution surface.

-- Trigger + bootstrap helpers: callable by no client role at all.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function audit.log_change() from public, anon, authenticated;
revoke execute on function public.rajask_bundle_actions(text) from public, anon, authenticated;

-- Resolver helpers + realm bootstrap: authenticated only (never anon/public).
revoke execute on function public.rajask_is_realm_member(uuid) from public, anon;
revoke execute on function public.rajask_is_sovereign(uuid) from public, anon;
revoke execute on function public.rajask_shares_realm(uuid) from public, anon;
revoke execute on function public.rajask_has_permission(uuid, uuid, text, text) from public, anon;
revoke execute on function public.rajask_authority_limit(uuid, uuid, text, text) from public, anon;
revoke execute on function public.rajask_can_see_company(uuid) from public, anon;
revoke execute on function public.rajask_create_realm(text, text) from public, anon;

grant execute on function public.rajask_is_realm_member(uuid) to authenticated;
grant execute on function public.rajask_is_sovereign(uuid) to authenticated;
grant execute on function public.rajask_shares_realm(uuid) to authenticated;
grant execute on function public.rajask_has_permission(uuid, uuid, text, text) to authenticated;
grant execute on function public.rajask_authority_limit(uuid, uuid, text, text) to authenticated;
grant execute on function public.rajask_can_see_company(uuid) to authenticated;
grant execute on function public.rajask_create_realm(text, text) to authenticated;
