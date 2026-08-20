-- Consolidates the two halves of one domain into a single Class concept.
--
-- 20260820150000_classes.sql created public.classes as the *occurrence* (a
-- dated session carrying attendance/exam) while public.class_schedules held
-- the recurring definition. That left the app with two pages, two nav items
-- and inverted names: the table called "classes" was never a class, and the
-- recurring class a student would actually name ("Math, Monday 16:00") was
-- buried under "schedules".
--
-- After this migration:
--   public.classes            = the recurring weekly class, repeating
--                               indefinitely (no starts_on/ends_on)
--   public.class_occurrences  = one dated instance of a class, owning
--                               attendance_status and exam_status
--
-- Order matters throughout: the occurrence table has to vacate the "classes"
-- name (along with its pkey/index names) before class_schedules can take it.

-- ---------------------------------------------------------------------------
-- 1. public.classes -> public.class_occurrences
-- ---------------------------------------------------------------------------

alter table public.classes rename to class_occurrences;
alter table public.class_occurrences rename column class_schedule_id to class_id;

-- ALTER TABLE ... RENAME does not cascade to indexes, constraints or
-- triggers, and every one of these names has to be freed before step 2.
alter index public.classes_pkey rename to class_occurrences_pkey;
alter index public.idx_classes_schedule_occurrence rename to idx_class_occurrences_class_date;
alter index public.idx_classes_user rename to idx_class_occurrences_user;
alter index public.idx_classes_subject rename to idx_class_occurrences_subject;
alter index public.idx_classes_user_date rename to idx_class_occurrences_user_date;

-- teacher/location are about to move to the recurring class, so the index
-- covering them here goes with them (recreated on public.classes in step 2).
drop index public.idx_classes_user_teacher;

alter table public.class_occurrences
  rename constraint classes_user_id_fkey to class_occurrences_user_id_fkey;
alter table public.class_occurrences
  rename constraint classes_subject_id_fkey to class_occurrences_subject_id_fkey;
alter table public.class_occurrences
  rename constraint classes_duration_minutes_check to class_occurrences_duration_minutes_check;
alter table public.class_occurrences
  rename constraint classes_attendance_status_check to class_occurrences_attendance_status_check;
alter table public.class_occurrences
  rename constraint classes_exam_status_check to class_occurrences_exam_status_check;

alter trigger set_classes_updated_at on public.class_occurrences
  rename to set_class_occurrences_updated_at;

alter policy "Users can view their own classes"
  on public.class_occurrences rename to "Users can view their own class occurrences";
alter policy "Users can create their own classes"
  on public.class_occurrences rename to "Users can create their own class occurrences";
alter policy "Users can update their own classes"
  on public.class_occurrences rename to "Users can update their own class occurrences";
alter policy "Users can delete their own classes"
  on public.class_occurrences rename to "Users can delete their own class occurrences";

alter table public.settings
  rename column classes_materialized_at to class_occurrences_materialized_at;

comment on column public.settings.class_occurrences_materialized_at is
  'When class occurrences were last materialized from public.classes for '
  'this user. The read path compare-and-sets this before generating, '
  'mirroring notifications_generated_at — see '
  '20260816120019_notifications_on_demand.sql.';

-- ---------------------------------------------------------------------------
-- 2. public.class_schedules -> public.classes (the recurring class)
-- ---------------------------------------------------------------------------

alter table public.class_schedules rename to classes;
alter table public.classes rename column schedules to meetings;

alter index public.class_schedules_pkey rename to classes_pkey;
alter index public.idx_class_schedules_user rename to idx_classes_user;
alter index public.idx_class_schedules_subject rename to idx_classes_subject;
alter index public.idx_class_schedules_user_active rename to idx_classes_user_active;

alter table public.classes
  rename constraint class_schedules_user_id_fkey to classes_user_id_fkey;
alter table public.classes
  rename constraint class_schedules_subject_id_fkey to classes_subject_id_fkey;
alter table public.classes
  rename constraint class_schedules_schedules_valid to classes_meetings_valid;

alter trigger set_class_schedules_updated_at on public.classes
  rename to set_classes_updated_at;

alter policy "Users can view their own class schedules"
  on public.classes rename to "Users can view their own classes";
alter policy "Users can create their own class schedules"
  on public.classes rename to "Users can create their own classes";
alter policy "Users can update their own class schedules"
  on public.classes rename to "Users can update their own classes";
alter policy "Users can delete their own class schedules"
  on public.classes rename to "Users can delete their own classes";

alter function public.validate_class_schedule_entries(jsonb)
  rename to validate_class_meetings;

comment on function public.validate_class_meetings(jsonb) is
  'Validates public.classes.meetings: non-empty JSON array of '
  '{dayOfWeek: 0-6 unique, startTime: "HH:mm", durationMinutes: positive}, '
  'matching src/lib/types/class.ts ClassMeeting.';

-- A class recurs every week for as long as it exists; pausing is what
-- is_active is for. The bounded-term model these two columns implemented was
-- never a requirement, and dropping them takes the ends_on >= starts_on check
-- constraint with them.
alter table public.classes
  drop column starts_on,
  drop column ends_on;

-- Moved off the occurrence: teacher is an attribute of the recurring class,
-- and src/lib/search/query.ts now finds each teacher once here rather than
-- once per materialized occurrence.
create index idx_classes_user_teacher
  on public.classes (user_id, teacher)
  where teacher is not null;

-- ---------------------------------------------------------------------------
-- 3. Adopt standalone occurrences, then make class_id mandatory
-- ---------------------------------------------------------------------------

-- Occurrences with class_id IS NULL are the one-off rows the old standalone
-- "new class" form created. Occurrences can no longer exist without a class,
-- so each distinct (user, subject, teacher, location) group of them becomes a
-- recurring class built from the weekdays/times it actually used. The new
-- classes are created *paused* (is_active = false): the point is to preserve
-- the recorded attendance history, not to silently start generating weekly
-- occurrences the student never asked for.
alter table public.classes add column adopted_source_key text;

insert into public.classes
  (user_id, subject_id, teacher, location, meetings, is_active, adopted_source_key)
select
  g.user_id,
  g.subject_id,
  g.teacher,
  g.location,
  g.meetings,
  false,
  g.source_key
from (
  select
    o.user_id,
    o.subject_id,
    o.teacher,
    o.location,
    o.user_id::text || '|' || o.subject_id::text || '|'
      || coalesce(o.teacher, '') || '|' || coalesce(o.location, '') as source_key,
    (
      -- One entry per weekday: classes_meetings_valid rejects duplicate
      -- dayOfWeek values, so a group that used two different times on the
      -- same weekday keeps the earliest.
      select jsonb_agg(entry order by (entry ->> 'dayOfWeek')::int)
      from (
        select distinct on (extract(dow from inner_o.date)::int)
          jsonb_build_object(
            'dayOfWeek', extract(dow from inner_o.date)::int,
            'startTime', to_char(inner_o.start_time, 'HH24:MI'),
            'durationMinutes', inner_o.duration_minutes
          ) as entry
        from public.class_occurrences inner_o
        where inner_o.class_id is null
          and inner_o.user_id = o.user_id
          and inner_o.subject_id = o.subject_id
          and inner_o.teacher is not distinct from o.teacher
          and inner_o.location is not distinct from o.location
        order by extract(dow from inner_o.date)::int, inner_o.start_time
      ) entries
    ) as meetings
  from public.class_occurrences o
  where o.class_id is null
  group by o.user_id, o.subject_id, o.teacher, o.location
) g;

update public.class_occurrences o
set class_id = c.id
from public.classes c
where o.class_id is null
  and c.adopted_source_key =
    o.user_id::text || '|' || o.subject_id::text || '|'
      || coalesce(o.teacher, '') || '|' || coalesce(o.location, '');

alter table public.classes drop column adopted_source_key;

-- Deleting a class now takes its occurrences (and their attendance history)
-- with it. Under `on delete set null` those rows survived as standalone
-- orphans, which is exactly the second creation path being removed here.
alter table public.class_occurrences
  drop constraint classes_class_schedule_id_fkey;

alter table public.class_occurrences
  alter column class_id set not null,
  drop column teacher,
  drop column location,
  add constraint class_occurrences_class_id_fkey
    foreign key (class_id) references public.classes (id) on delete cascade;

-- class_id is NOT NULL now, so the partial predicate that kept standalone
-- rows from colliding has nothing left to exclude.
drop index public.idx_class_occurrences_class_date;
create unique index idx_class_occurrences_class_date
  on public.class_occurrences (class_id, date);

create index idx_class_occurrences_class on public.class_occurrences (class_id);

comment on table public.classes is
  'Matches src/lib/types/class.ts Class. A recurring weekly class the student '
  'attends — the single source of truth for the domain, replacing the former '
  'class_schedules/classes split. `meetings` is a JSONB array of per-day '
  '{dayOfWeek, startTime, durationMinutes} entries (see '
  'validate_class_meetings()), so one class can meet at different times on '
  'different days. It repeats indefinitely; is_active pauses it.';

comment on table public.class_occurrences is
  'Matches src/lib/types/class-occurrence.ts ClassOccurrence. One dated '
  'instance of a public.classes row, materialized from its meetings by '
  'ensureClassOccurrencesForUser() in '
  'src/actions/class-occurrences.generate.ts. attendance_status and '
  'exam_status live here rather than on the class because they differ every '
  'week; attendance_status is NULL until recorded, which is the state of '
  'every freshly materialized occurrence. start_time/duration_minutes are '
  'snapshotted at materialization so editing a class never rewrites the '
  'timing of occurrences that already happened.';

-- ---------------------------------------------------------------------------
-- 4. lessons FK follows the renamed table
-- ---------------------------------------------------------------------------

-- Mechanical only: the column already pointed at what is now
-- class_occurrences, and leaving it named class_id beside a real public.classes
-- table would read as pointing at the recurring class. The Lessons domain is
-- otherwise untouched by this migration.
alter table public.lessons rename column class_id to class_occurrence_id;
alter index public.idx_lessons_class rename to idx_lessons_class_occurrence;
alter table public.lessons
  rename constraint lessons_class_id_fkey to lessons_class_occurrence_id_fkey;

comment on column public.lessons.class_occurrence_id is
  'Optional link to the class occurrence this lesson was studied for. '
  'ON DELETE SET NULL: losing the occurrence must not delete the student''s '
  'own lesson, notes or attachments.';

-- ---------------------------------------------------------------------------
-- 5. Reissue sync_user_achievements() against the renamed table
-- ---------------------------------------------------------------------------

-- plpgsql resolves table names at execution time, so the version from
-- 20260820150002_gamification_attendance_from_classes.sql would silently
-- start reading the *recurring* public.classes — which has no
-- attendance_status column — and fail at runtime. Applied migrations are
-- never edited, so this reissues the whole function with only the
-- perfect-attendance query retargeted to public.class_occurrences.
create or replace function public.sync_user_achievements()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_completed_lessons integer;
  v_total_minutes numeric;
  v_ace_exam boolean;
  v_current_streak integer;
  v_longest_streak integer;
  v_prev_month_start date := (date_trunc('month', current_date) - interval '1 month')::date;
  v_prev_month_end date := (date_trunc('month', current_date) - interval '1 day')::date;
  v_prev_month_total integer;
  v_prev_month_attended integer;
begin
  if v_user_id is null then
    raise exception 'sync_user_achievements requires an authenticated user';
  end if;

  -- first-lesson: at least one completed/reviewed lesson.
  select count(*) into v_completed_lessons
  from public.lessons
  where user_id = v_user_id and study_status in ('completed', 'reviewed');

  -- hundred-hours: total logged study time across all sessions.
  select coalesce(sum(duration_minutes), 0) into v_total_minutes
  from public.study_sessions
  where user_id = v_user_id;

  -- exam-ace: any exam scored at 90% or higher.
  select exists (
    select 1 from public.exams
    where user_id = v_user_id and percentage >= 90
  ) into v_ace_exam;

  -- streak-7 / streak-30: mirrors computeStreaks() in src/actions/dashboard.ts —
  -- longest run of consecutive calendar days with a study_sessions row, found
  -- by grouping each date with (date - row_number()), which is constant
  -- within a consecutive run and changes at every gap.
  with study_days as (
    select distinct date_trunc('day', started_at)::date as day
    from public.study_sessions
    where user_id = v_user_id
  ),
  grouped as (
    select day, day - (row_number() over (order by day))::integer as grp
    from study_days
  ),
  runs as (
    select min(day) as run_start, max(day) as run_end, count(*) as run_length
    from grouped
    group by grp
  )
  select
    coalesce(max(run_length), 0),
    coalesce(
      (select run_length from runs
       where run_end >= current_date - 1 and run_end <= current_date
       order by run_end desc limit 1),
      0
    )
  into v_longest_streak, v_current_streak
  from runs;

  -- perfect-attendance: every *recorded* class occurrence in the most
  -- recently fully completed calendar month was attended. Evaluated against
  -- last month rather than the in-progress one, since "today" is always
  -- inside the current month and checking it against a still-accumulating
  -- month would only ever be correct on the literal last calendar day.
  -- Counting against attendance_status is not null (rather than every row)
  -- keeps future/untouched occurrences from diluting the rate.
  select
    count(*) filter (where attendance_status is not null),
    count(*) filter (where attendance_status = 'attended')
  into v_prev_month_total, v_prev_month_attended
  from public.class_occurrences
  where user_id = v_user_id
    and date >= v_prev_month_start
    and date <= v_prev_month_end;

  -- Upsert each achievement's progress/unlock state. greatest()/coalesce()
  -- keep progress and unlocked_at from ever regressing once earned —
  -- achievements are historical milestones (e.g. a broken streak shouldn't
  -- un-earn streak-7), not live gauges.
  insert into public.user_achievements (user_id, achievement_id, progress, unlocked_at)
  select v_user_id, a.id, v.progress, case when v.unlocked then now() else null end
  from public.achievements a
  join (values
    ('first-lesson', least(v_completed_lessons, 1) * 100, v_completed_lessons >= 1),
    ('streak-7', least(v_longest_streak, 7) * 100 / 7, v_longest_streak >= 7),
    ('streak-30', least(v_longest_streak, 30) * 100 / 30, v_longest_streak >= 30),
    ('hundred-hours', (least(v_total_minutes, 6000) * 100 / 6000)::integer, v_total_minutes >= 6000),
    ('perfect-attendance',
      case when v_prev_month_total = 0 then 0 else (v_prev_month_attended * 100 / v_prev_month_total) end,
      v_prev_month_total > 0 and v_prev_month_attended = v_prev_month_total),
    ('exam-ace', case when v_ace_exam then 100 else 0 end, v_ace_exam)
  ) as v(key, progress, unlocked)
    on v.key = a.key
  on conflict (user_id, achievement_id) do update
  set
    progress = greatest(public.user_achievements.progress, excluded.progress),
    unlocked_at = coalesce(public.user_achievements.unlocked_at, excluded.unlocked_at),
    updated_at = now();
end;
$$;

comment on function public.sync_user_achievements() is
  'Recomputes all six catalog achievements for auth.uid() from real study '
  'data and upserts into user_achievements. SECURITY DEFINER because that '
  'table has no client-writable policy (see 20260807120014_achievements.sql). '
  'perfect-attendance reads public.class_occurrences (retargeted from '
  'public.classes in 20260820160000_classes_consolidation.sql, when that '
  'name became the recurring class). Idempotent and safe to call on every '
  'dashboard/achievements load.';

grant execute on function public.sync_user_achievements() to authenticated;
