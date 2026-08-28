-- Phase 5 (#1) of plans/adding-teachers-to-lessonio.md: a custom access
-- token hook that stamps `profiles.role` onto the JWT as a `user_role`
-- claim, so middleware can stop querying `profiles` on every role-relevant
-- request (see src/lib/supabase/middleware.ts).
--
-- This migration only creates and grants the Postgres function — Supabase
-- Auth hooks are wired up in the Dashboard, not in supabase/migrations/, so
-- the hook has no effect until that manual step runs:
--
--   1. Supabase Dashboard -> this project -> Authentication -> Hooks
--   2. Add hook -> "Custom Access Token" -> Postgres function
--      -> select `public.custom_access_token_hook`
--   3. Enable it.
--
-- Until then, every session's JWT simply lacks the `user_role` claim, and
-- src/lib/supabase/middleware.ts falls back to the `profiles` query it uses
-- today — flipping the hook on is a pure perf win with no code deploy
-- required on either side of that switch, and turning it back off degrades
-- the same way. `role = null` (onboarding not finished) is stamped as JSON
-- `null`, not omitted, so the middleware can tell "hook ran, no role yet"
-- apart from "hook never ran" (claim key absent) without a second signal.

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  v_role text;
  claims jsonb;
begin
  select role into v_role
  from public.profiles
  where id = (event ->> 'user_id')::uuid;

  claims := coalesce(event -> 'claims', '{}'::jsonb);
  claims := jsonb_set(claims, '{user_role}', to_jsonb(v_role));

  return jsonb_set(event, '{claims}', claims);
end;
$$;

comment on function public.custom_access_token_hook(jsonb) is
  'Supabase Auth Hook (configured in Dashboard, see migration header). Runs '
  'as supabase_auth_admin at token-issue time, which has no RLS bypass of '
  'its own — the permissive SELECT policy below is what lets it read '
  'profiles.role for an arbitrary user_id.';

-- supabase_auth_admin is the role Supabase Auth actually runs hooks as; it
-- needs explicit schema usage and a read path to profiles.role, since RLS
-- still applies to it like any other role.
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;

grant select on public.profiles to supabase_auth_admin;

create policy "Auth hook can read role for the access token"
  on public.profiles
  as permissive
  for select
  to supabase_auth_admin
  using (true);
