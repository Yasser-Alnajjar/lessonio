-- profiles is the app-facing "users" table from the spec. Supabase Auth
-- owns auth.users (email, password, sessions); this table holds everything
-- the app needs to query/join/display and that auth.users shouldn't carry.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  timezone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'One row per auth.users row. Populated automatically by handle_new_user() on signup.';

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-provision a profile row whenever a new auth user is created, seeded
-- from whatever signup passed in via user_metadata (see
-- src/actions/auth.mutations.ts `register`). Runs as SECURITY DEFINER
-- because the auth.users trigger fires before the new session exists, so
-- there's no authenticated role yet to satisfy profiles' RLS policy.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, timezone)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url',
    new.raw_user_meta_data ->> 'timezone'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- No insert/delete policy for `authenticated`: rows are created exclusively
-- by handle_new_user() and removed exclusively via the auth.users cascade.
