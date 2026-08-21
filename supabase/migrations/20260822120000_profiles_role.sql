-- ---------------------------------------------------------------------------
-- Adds a role to public.profiles: "student" or "teacher", chosen once at
-- signup and immutable after. See plans/adding-teachers-to-lessonio.md for
-- the full feature design — this is Phase 1, the foundation only. No
-- existing behavior changes: every current row is backfilled to 'student'.
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column role text check (role in ('student', 'teacher'));

comment on column public.profiles.role is
  'Application role, chosen once at signup and immutable thereafter (see '
  'enforce_profile_role_immutable()). Nullable because OAuth signup has no '
  'form to collect it up front — a null role sends the user to '
  '/onboarding/role once. Text + CHECK rather than an enum, matching every '
  'other enum-like column in this schema.';

-- Backfill every existing user. There is no such thing as "no role" once
-- onboarding is done — a null here would otherwise send every current user
-- back through /onboarding/role on next sign-in.
update public.profiles set role = 'student' where role is null;

create index idx_profiles_role on public.profiles (role);

-- ---------------------------------------------------------------------------
-- Reissue handle_new_user() to also seed role from a whitelisted
-- raw_user_meta_data read (client-supplied, so it's never trusted blindly —
-- anything other than 'student'/'teacher' falls back to null, sending the
-- user through onboarding just like an OAuth signup). Applied migrations are
-- never edited — this reissues the whole function; precedent:
-- sync_user_achievements() in 20260820160000_classes_consolidation.sql.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, timezone, role)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url',
    new.raw_user_meta_data ->> 'timezone',
    case
      when new.raw_user_meta_data ->> 'role' in ('student', 'teacher')
        then new.raw_user_meta_data ->> 'role'
      else null
    end
  );
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Role is a one-time choice. The existing "Users can update their own
-- profile" policy has no column scope, so nothing stops a client PATCHing
-- role directly — this trigger is the actual enforcement. Allows exactly
-- one null -> 'student'|'teacher' transition (via set_my_role() below) and
-- rejects every other change, including unsetting it back to null.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_profile_role_immutable()
returns trigger
language plpgsql
as $$
begin
  if old.role is distinct from new.role and old.role is not null then
    raise exception 'profiles.role is immutable once set' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger enforce_profile_role_immutable
  before update on public.profiles
  for each row execute function public.enforce_profile_role_immutable();

comment on function public.enforce_profile_role_immutable() is
  'BEFORE UPDATE guard: role may transition null -> student|teacher exactly '
  'once and never change again (including unsetting it). The role picker at '
  'registration/onboarding is a one-time, permanent choice by design.';

-- ---------------------------------------------------------------------------
-- The sanctioned write path for role once a user already has a session
-- (the OAuth path — signInWithOAuth has no form, so those users land on
-- /onboarding/role and call this). SECURITY DEFINER isn't strictly required
-- since the existing "Users can update their own profile" policy already
-- lets a user UPDATE their own row, but this is the single call site the
-- app uses, and the current-role check turns "already chosen" into an
-- explicit error instead of a silent no-op.
-- ---------------------------------------------------------------------------
create or replace function public.set_my_role(p_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'set_my_role requires an authenticated user';
  end if;

  if p_role not in ('student', 'teacher') then
    raise exception 'invalid role: %', p_role using errcode = '22023';
  end if;

  update public.profiles
  set role = p_role
  where id = auth.uid() and role is null;

  if not found then
    raise exception 'role already set' using errcode = '42501';
  end if;
end;
$$;

comment on function public.set_my_role(text) is
  'Writes profiles.role exactly once, only while it is currently null. The '
  'immutability trigger is the real guarantee; this just turns a second '
  'call into a clear error instead of a silent no-op.';

revoke execute on function public.set_my_role(text) from public, anon;
grant execute on function public.set_my_role(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Anti-recursion primitive every teacher-feature RLS policy (Phase 2+) is
-- built on: reading profiles.role from *inside* another table's policy
-- would otherwise need to go through profiles' own RLS, and a policy that
-- reads profiles from inside a profiles policy self-recurses. SECURITY
-- DEFINER skips RLS entirely and just returns the caller's own role.
-- ---------------------------------------------------------------------------
create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

comment on function public.current_app_role() is
  'Returns auth.uid()''s role, or null if unset/signed out. STABLE '
  'SECURITY DEFINER so later policies (teacher_classes, assignments, ...) '
  'can call it without re-entering profiles'' own RLS. Never grant to anon.';

revoke execute on function public.current_app_role() from public, anon;
grant execute on function public.current_app_role() to authenticated;
