create table public.settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  locale text not null default 'en',
  notification_preferences jsonb not null default '{
    "enabledInBrowser": true,
    "types": {
      "upcoming_lesson": true,
      "homework_due": true,
      "daily_reminder": true,
      "review_reminder": true
    }
  }'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.settings is 'Matches src/lib/types/settings.ts UserSettings. One row per user.';

create trigger set_settings_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();

-- Provision a default settings row alongside the profile, seeded from the
-- locale the user was signed up in (see the `next-intl` locale on the
-- register form) when provided.
create or replace function public.handle_new_user_settings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.settings (user_id, locale)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'locale', 'en'));
  return new;
end;
$$;

create trigger on_auth_user_created_settings
  after insert on auth.users
  for each row execute function public.handle_new_user_settings();

alter table public.settings enable row level security;

create policy "Users can view their own settings"
  on public.settings for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can update their own settings"
  on public.settings for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- No insert policy for `authenticated`: the row is provisioned exclusively
-- by handle_new_user_settings() above.
