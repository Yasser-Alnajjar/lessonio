-- Phase 5 (#2) of plans/adding-teachers-to-lessonio.md: notifications for
-- assignments. Adds `assignment_assigned` (a teacher publishes an
-- assignment) and `assignment_graded` (a teacher grades a submission).
--
-- Both are cross-user writes: the acting user (the teacher) is never the
-- recipient (the student), so the self-only insert policy added by
-- 20260816120019_notifications_on_demand.sql ("user_id = auth.uid()") cannot
-- cover them, and per admin.ts's own doc comment the service-role client is
-- reserved for account deletion, not for working around RLS. Both new types
-- are written by a SECURITY DEFINER function instead, following the same
-- authorization-then-bypass shape as every other definer helper in this
-- feature: verify the caller is the teacher who owns the assignment, then
-- insert on behalf of the student(s) who cannot otherwise be written to by
-- that caller.

-- ---------------------------------------------------------------------------
-- 1. Widen the `type` check constraint (same pattern as
--    20260816120023_notifications_upcoming_class.sql).
-- ---------------------------------------------------------------------------
do $$
declare
  target_constraint text;
  type_col_num smallint;
begin
  select attnum into type_col_num
  from pg_attribute
  where attrelid = 'public.notifications'::regclass
    and attname = 'type';

  select con.conname into target_constraint
  from pg_constraint con
  where con.conrelid = 'public.notifications'::regclass
    and con.contype = 'c'
    and type_col_num = any(con.conkey)
  limit 1;

  if target_constraint is not null then
    execute format('alter table public.notifications drop constraint %I', target_constraint);
  end if;
end $$;

alter table public.notifications
  add constraint notifications_type_check
    check (type in (
      'upcoming_lesson', 'homework_due', 'daily_reminder', 'upcoming_class',
      'review_reminder', 'assignment_assigned', 'assignment_graded'
    ));

-- ---------------------------------------------------------------------------
-- 2. Widen the settings default + backfill existing rows.
-- ---------------------------------------------------------------------------
alter table public.settings
  alter column notification_preferences set default '{
    "enabledInBrowser": true,
    "enabledInEmail": false,
    "types": {
      "upcoming_lesson": true,
      "homework_due": true,
      "daily_reminder": true,
      "upcoming_class": true,
      "review_reminder": true,
      "assignment_assigned": true,
      "assignment_graded": true
    }
  }'::jsonb;

update public.settings
set notification_preferences =
  jsonb_set(notification_preferences, '{types,assignment_assigned}', 'true'::jsonb)
where not (notification_preferences -> 'types' ? 'assignment_assigned');

update public.settings
set notification_preferences =
  jsonb_set(notification_preferences, '{types,assignment_graded}', 'true'::jsonb)
where not (notification_preferences -> 'types' ? 'assignment_graded');

-- ---------------------------------------------------------------------------
-- 3. notify_assignment_published() — one notification per actively enrolled
--    student, honoring their own `assignment_assigned` preference. Dedupe key
--    is per (assignment, student) with no date component, so toggling
--    publish/unpublish/publish again never re-notifies — a published
--    assignment is assigned exactly once from the student's point of view.
-- ---------------------------------------------------------------------------
create or replace function public.notify_assignment_published(p_assignment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_class_id uuid;
  v_title text;
begin
  if auth.uid() is null then
    raise exception 'notify_assignment_published requires an authenticated user';
  end if;

  select teacher_class_id, title into v_class_id, v_title
  from public.assignments
  where id = p_assignment_id
    and teacher_id = auth.uid()
    and status = 'published';

  if v_class_id is null then
    raise exception 'not authorized to notify for this assignment' using errcode = '42501';
  end if;

  insert into public.notifications (user_id, type, title, body, link_path, dedupe_key)
  select
    ce.student_id,
    'assignment_assigned',
    case when coalesce(s.locale, 'en') = 'ar' then 'واجب جديد' else 'New assignment' end,
    case when coalesce(s.locale, 'en') = 'ar'
      then v_title || ' — تم تكليفك بواجب جديد من معلمك.'
      else v_title || ' — your teacher assigned a new one.'
    end,
    '/classroom/assignments',
    'assignment_assigned:' || p_assignment_id::text
  from public.class_enrollments ce
  left join public.settings s on s.user_id = ce.student_id
  where ce.teacher_class_id = v_class_id
    and ce.status = 'active'
    and coalesce((s.notification_preferences -> 'types' ->> 'assignment_assigned')::boolean, true)
  on conflict (user_id, dedupe_key) do nothing;
end;
$$;

comment on function public.notify_assignment_published(uuid) is
  'Called by publishAssignment() right after the status flip. Re-derives '
  'authorization from assignments itself (teacher_id = auth.uid(), '
  'status = ''published'') rather than trusting the caller, since SECURITY '
  'DEFINER bypasses RLS entirely.';

-- ---------------------------------------------------------------------------
-- 4. notify_submission_graded() — one notification to the submitting
--    student. Dedupe key includes graded_at (stamped fresh by
--    enforce_submission_write_scope() on every grading write), so a regrade
--    notifies again but a no-op re-open of the same grade does not.
-- ---------------------------------------------------------------------------
create or replace function public.notify_submission_graded(p_submission_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid;
  v_title text;
  v_score numeric(6, 2);
  v_graded_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'notify_submission_graded requires an authenticated user';
  end if;

  select sub.student_id, sub.score, sub.graded_at, a.title
  into v_student_id, v_score, v_graded_at, v_title
  from public.assignment_submissions sub
  join public.assignments a on a.id = sub.assignment_id
  where sub.id = p_submission_id
    and a.teacher_id = auth.uid()
    and sub.graded_at is not null;

  if v_student_id is null then
    raise exception 'not authorized to notify for this submission' using errcode = '42501';
  end if;

  insert into public.notifications (user_id, type, title, body, link_path, dedupe_key)
  select
    v_student_id,
    'assignment_graded',
    case when coalesce(s.locale, 'en') = 'ar' then 'تم تصحيح واجبك' else 'Assignment graded' end,
    case when coalesce(s.locale, 'en') = 'ar'
      then v_title || ' — الدرجة: ' || v_score::text
      else v_title || ' — score: ' || v_score::text
    end,
    '/classroom/assignments',
    'assignment_graded:' || p_submission_id::text || ':' || v_graded_at::text
  from public.settings s
  where s.user_id = v_student_id
    and coalesce((s.notification_preferences -> 'types' ->> 'assignment_graded')::boolean, true)
  on conflict (user_id, dedupe_key) do nothing;
end;
$$;

comment on function public.notify_submission_graded(uuid) is
  'Called by gradeSubmission() right after the update. Re-derives '
  'authorization from assignment_submissions/assignments itself '
  '(a.teacher_id = auth.uid(), sub.graded_at is not null) rather than '
  'trusting the caller.';

revoke execute on function public.notify_assignment_published(uuid) from public, anon;
revoke execute on function public.notify_submission_graded(uuid) from public, anon;
grant execute on function public.notify_assignment_published(uuid) to authenticated;
grant execute on function public.notify_submission_graded(uuid) to authenticated;
