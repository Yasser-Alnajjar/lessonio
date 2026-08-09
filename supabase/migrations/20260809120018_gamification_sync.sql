-- Central sync for the six achievement keys seeded in
-- 20260807120014_achievements.sql. SECURITY DEFINER because
-- user_achievements intentionally has no INSERT/UPDATE policy for
-- `authenticated` (see that migration's trailing comment) — this function
-- is the sanctioned write path. It reads auth.uid() internally rather than
-- taking a parameter, so a signed-in user can only ever sync their own row.
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

  -- perfect-attendance: every lesson in the most recently *fully completed*
  -- calendar month was attended. Evaluated against last month rather than
  -- the in-progress one, since "today" is always inside the current month
  -- and checking it against a still-accumulating month would only ever be
  -- correct on the literal last calendar day.
  select count(*), count(*) filter (where attendance_status = 'attended')
  into v_prev_month_total, v_prev_month_attended
  from public.lessons
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
  'Idempotent and safe to call on every dashboard/achievements load.';

grant execute on function public.sync_user_achievements() to authenticated;
