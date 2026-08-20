create table public.classes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  class_schedule_id uuid references public.class_schedules (id) on delete set null,
  date date not null,
  start_time time not null,
  duration_minutes integer not null check (duration_minutes > 0),
  teacher text,
  location text,
  attendance_status text
    check (attendance_status in ('attended', 'absent', 'late', 'cancelled')),
  exam_status text not null default 'none'
    check (exam_status in ('none', 'upcoming', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.classes is
  'Matches src/lib/types/class.ts Class. A real-world scheduled class session '
  'on a specific date — distinct from lessons, which are self-managed study '
  'items. attendance_status is nullable: NULL means "not recorded yet", which '
  'is the state of every future occurrence materialized from class_schedules '
  'and of standalone classes nobody has marked. class_schedule_id links back '
  'to the recurring template that generated this occurrence, when there is '
  'one; it is nullable so standalone (unscheduled) classes are supported.';

-- One materialized occurrence per (schedule, date). validate_class_schedule_entries()
-- already forbids two entries on the same weekday within a schedule, so this
-- is the correct uniqueness. The partial predicate keeps standalone rows
-- (class_schedule_id is null) from ever colliding with each other.
create unique index idx_classes_schedule_occurrence
  on public.classes (class_schedule_id, date)
  where class_schedule_id is not null;

create index idx_classes_user on public.classes (user_id);
create index idx_classes_subject on public.classes (subject_id);
create index idx_classes_user_date on public.classes (user_id, date);
create index idx_classes_user_teacher on public.classes (user_id, teacher) where teacher is not null;

create trigger set_classes_updated_at
  before update on public.classes
  for each row execute function public.set_updated_at();

alter table public.classes enable row level security;

create policy "Users can view their own classes"
  on public.classes for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can create their own classes"
  on public.classes for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users can update their own classes"
  on public.classes for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users can delete their own classes"
  on public.classes for delete
  to authenticated
  using (user_id = (select auth.uid()));

alter table public.settings add column classes_materialized_at timestamptz;

comment on column public.settings.classes_materialized_at is
  'When classes were last materialized from class_schedules for this user. '
  'The read path compare-and-sets this before generating, mirroring '
  'notifications_generated_at — see 20260816120019_notifications_on_demand.sql.';
