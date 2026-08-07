-- Achievement *definitions* are a shared catalog, not per-user data — the
-- alternative (one full row per user per achievement, including locked ones)
-- would duplicate title/description/icon across every user for no benefit.
create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  title text not null,
  description text not null,
  icon text not null,
  created_at timestamptz not null default now()
);

comment on table public.achievements is
  'Catalog of achievement definitions. Per-user unlock state lives in user_achievements.';

create table public.user_achievements (
  user_id uuid not null references auth.users (id) on delete cascade,
  achievement_id uuid not null references public.achievements (id) on delete cascade,
  unlocked_at timestamptz,
  progress smallint not null default 0 check (progress between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

comment on table public.user_achievements is
  'Matches src/lib/types/achievement.ts Achievement once joined to achievements. '
  'Together they satisfy the "achievements" table from the spec, normalized.';

create index idx_user_achievements_user on public.user_achievements (user_id);

create trigger set_user_achievements_updated_at
  before update on public.user_achievements
  for each row execute function public.set_updated_at();

alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;

-- The catalog is public read-only reference data — safe for any signed-in
-- user to see the full list of achievements (including ones they haven't
-- unlocked yet, so the UI can show "locked" states).
create policy "Authenticated users can view the achievement catalog"
  on public.achievements for select
  to authenticated
  using (true);

create policy "Users can view their own achievement progress"
  on public.user_achievements for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Intentionally no insert/update/delete policy for `authenticated` on either
-- table: unlocking an achievement is a side effect of study activity, not a
-- direct user action, so writes go through a SECURITY DEFINER function or
-- the service role (built out alongside the relevant CRUD phases) — never
-- a client-initiated mutation a user could use to self-award progress.

insert into public.achievements (key, title, description, icon) values
  ('first-lesson', 'First Lesson', 'Log your first lesson.', 'sparkles'),
  ('streak-7', '7-Day Streak', 'Study seven days in a row.', 'flame'),
  ('streak-30', '30-Day Streak', 'Study thirty days in a row.', 'flame'),
  ('hundred-hours', '100 Hours', 'Log 100 hours of total study time.', 'clock'),
  ('perfect-attendance', 'Perfect Attendance', 'Attend every lesson in a month.', 'check-circle'),
  ('exam-ace', 'Exam Ace', 'Score 90% or higher on an exam.', 'award')
on conflict (key) do nothing;
