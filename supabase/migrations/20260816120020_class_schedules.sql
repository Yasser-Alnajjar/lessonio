create table public.class_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  teacher text,
  location text,
  days_of_week smallint[] not null,
  start_time time not null,
  duration_minutes integer not null check (duration_minutes > 0),
  starts_on date not null,
  ends_on date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint class_schedules_days_of_week_not_empty check (cardinality(days_of_week) > 0),
  constraint class_schedules_days_of_week_valid check (days_of_week <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]),
  constraint class_schedules_ends_on_after_starts_on check (ends_on is null or ends_on >= starts_on)
);

comment on table public.class_schedules is
  'Matches src/lib/types/class-schedule.ts ClassSchedule. A recurring class '
  'the student attends (when/where) — distinct from lessons, which record '
  'what was studied. days_of_week: 0=Sunday .. 6=Saturday, may hold several '
  'values when the same time/teacher/location repeats on multiple days.';

create index idx_class_schedules_user on public.class_schedules (user_id);
create index idx_class_schedules_subject on public.class_schedules (subject_id);
create index idx_class_schedules_user_active on public.class_schedules (user_id) where is_active;

create trigger set_class_schedules_updated_at
  before update on public.class_schedules
  for each row execute function public.set_updated_at();

alter table public.class_schedules enable row level security;

create policy "Users can view their own class schedules"
  on public.class_schedules for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can create their own class schedules"
  on public.class_schedules for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users can update their own class schedules"
  on public.class_schedules for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users can delete their own class schedules"
  on public.class_schedules for delete
  to authenticated
  using (user_id = (select auth.uid()));
