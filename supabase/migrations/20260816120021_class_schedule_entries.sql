-- Different days of the same class can meet at different times/durations
-- (e.g. Thursday 4pm for two hours, Sunday 2pm for ninety minutes), so the
-- per-day schedule moves off `class_schedules` into its own child table.
-- `teacher`/`location` stay on `class_schedules` — they apply to the whole
-- class, not to a single day.
create table public.class_schedule_entries (
  id uuid primary key default gen_random_uuid(),
  class_schedule_id uuid not null references public.class_schedules (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  duration_minutes integer not null check (duration_minutes > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint class_schedule_entries_unique_day unique (class_schedule_id, day_of_week)
);

comment on table public.class_schedule_entries is
  'Matches src/lib/types/class-schedule.ts ClassScheduleEntry — one row per '
  'recurring weekday for a class_schedules row, each with its own start '
  'time and duration. day_of_week: 0=Sunday .. 6=Saturday. The unique '
  'constraint on (class_schedule_id, day_of_week) enforces that a class '
  'cannot have two different schedules on the same day.';

create index idx_class_schedule_entries_schedule on public.class_schedule_entries (class_schedule_id);
create index idx_class_schedule_entries_user on public.class_schedule_entries (user_id);

create trigger set_class_schedule_entries_updated_at
  before update on public.class_schedule_entries
  for each row execute function public.set_updated_at();

alter table public.class_schedule_entries enable row level security;

create policy "Users can view their own class schedule entries"
  on public.class_schedule_entries for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can create their own class schedule entries"
  on public.class_schedule_entries for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users can update their own class schedule entries"
  on public.class_schedule_entries for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users can delete their own class schedule entries"
  on public.class_schedule_entries for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- Backfill: one entry per day previously packed into days_of_week, all
-- sharing the old single start_time/duration_minutes. This preserves every
-- existing class schedule's behavior exactly, while letting each day be
-- edited independently from now on.
insert into public.class_schedule_entries
  (class_schedule_id, user_id, day_of_week, start_time, duration_minutes)
select
  cs.id,
  cs.user_id,
  day,
  cs.start_time,
  cs.duration_minutes
from public.class_schedules cs
cross join lateral unnest(cs.days_of_week) as day;

alter table public.class_schedules
  drop column days_of_week,
  drop column start_time,
  drop column duration_minutes;

comment on table public.class_schedules is
  'Matches src/lib/types/class-schedule.ts ClassSchedule. A recurring class '
  'the student attends (when/where) — distinct from lessons, which record '
  'what was studied. Per-day timing (day/start time/duration) lives in '
  'class_schedule_entries; this row holds the subject, teacher, location, '
  'and the active date range shared by every day.';
