-- ---------------------------------------------------------------------------
-- Phase 4 of plans/adding-teachers-to-lessonio.md: submissions & grading.
-- See that file for the full design.
--
-- The column-scope problem is the most security-sensitive part of this
-- feature: with no column-level RLS, a single UPDATE policy that lets both
-- the student and the teacher touch a row would also let a student write
-- their own score and a teacher rewrite the student's content. The
-- enforce_submission_write_scope() trigger below splits the two paths.
--
-- Nothing in this migration adds a policy to lessons, lesson_notes,
-- attachments, flashcards, study_sessions, homework, exams, subjects,
-- classes, class_occurrences, goals, user_achievements, notifications,
-- settings, or tags.
-- ---------------------------------------------------------------------------

create table public.assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  student_id uuid not null references auth.users (id) on delete cascade,
  content text not null check (char_length(content) between 1 and 20000),
  submitted_at timestamptz not null default now(),
  score numeric(6, 2),
  feedback text check (feedback is null or char_length(feedback) <= 5000),
  graded_at timestamptz,
  graded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, student_id)
);

comment on table public.assignment_submissions is
  'A student''s submission to one assignment. status ("assigned" / '
  '"submitted" / "graded") is derived in the app mapper from submitted_at/'
  'graded_at, not stored — a student with no row here is "assigned" (see '
  'submissionsActions.getByAssignment() left-joining the roster).';

comment on column public.assignment_submissions.graded_by is
  'Set only by enforce_submission_write_scope() below, never by the client.';

create index idx_assignment_submissions_assignment
  on public.assignment_submissions (assignment_id);
create index idx_assignment_submissions_student
  on public.assignment_submissions (student_id);
create index idx_assignment_submissions_ungraded
  on public.assignment_submissions (assignment_id)
  where graded_at is null;

comment on index public.idx_assignment_submissions_ungraded is
  'Partial index backing the teacher grading queue, which filters on '
  'graded_at is null.';

create trigger set_assignment_submissions_updated_at
  before update on public.assignment_submissions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Anti-recursion helpers, same reasoning as 20260823120000_teacher_classes.sql.
-- ---------------------------------------------------------------------------
create or replace function public.is_teacher_of_assignment(p_assignment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.assignments
    where id = p_assignment_id and teacher_id = auth.uid()
  );
$$;

comment on function public.is_teacher_of_assignment(uuid) is
  'assignments.teacher_id is a direct column, so this is a single-table '
  'check — still routed through a definer helper for consistency with every '
  'other cross-table predicate in this feature.';

create or replace function public.can_submit_assignment(p_assignment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.assignments a
    where a.id = p_assignment_id
      and a.status = 'published'
      and public.is_enrolled_in_class(a.teacher_class_id)
  );
$$;

comment on function public.can_submit_assignment(uuid) is
  'True only for a published assignment whose class the caller is actively '
  'enrolled in — blocks submitting to a draft and blocks a removed student '
  'from submitting.';

revoke execute on function public.is_teacher_of_assignment(uuid) from public, anon;
revoke execute on function public.can_submit_assignment(uuid) from public, anon;
grant execute on function public.is_teacher_of_assignment(uuid) to authenticated;
grant execute on function public.can_submit_assignment(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- BEFORE UPDATE guard. assignment_id/student_id are pinned for both callers.
-- Beyond that, the two branches diverge:
--   - the submitting student (auth.uid() = old.student_id) may edit content/
--     submitted_at (resubmission) but never score/feedback/graded_at/
--     graded_by, and never once graded_at is already set;
--   - anyone else reaching this row only got here because the UPDATE
--     policy's USING clause already required is_teacher_of_assignment(), so
--     the else-branch is the grading path: it rejects content/submitted_at
--     changes, stamps graded_by/graded_at itself (never trusts the client
--     for those), and validates score against the assignment's total_points
--     — a cross-table check, so it cannot be a plain CHECK constraint.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_submission_write_scope()
returns trigger
language plpgsql
as $$
declare
  v_total_points numeric(6, 2);
begin
  if new.assignment_id is distinct from old.assignment_id
    or new.student_id is distinct from old.student_id then
    raise exception 'assignment_id and student_id are immutable on assignment_submissions'
      using errcode = '42501';
  end if;

  if auth.uid() = old.student_id then
    if old.graded_at is not null then
      raise exception 'a graded submission can no longer be edited'
        using errcode = '42501';
    end if;

    if new.score is distinct from old.score
      or new.feedback is distinct from old.feedback
      or new.graded_at is distinct from old.graded_at
      or new.graded_by is distinct from old.graded_by then
      raise exception 'students cannot set score, feedback, or grading fields'
        using errcode = '42501';
    end if;
  else
    if new.content is distinct from old.content
      or new.submitted_at is distinct from old.submitted_at then
      raise exception 'teachers cannot edit submission content'
        using errcode = '42501';
    end if;

    select total_points into v_total_points
    from public.assignments
    where id = new.assignment_id;

    if new.score is not null and new.score > v_total_points then
      raise exception 'score cannot exceed the assignment total points'
        using errcode = '23514';
    end if;

    new.graded_by := auth.uid();
    new.graded_at := now();
  end if;

  return new;
end;
$$;

create trigger enforce_submission_write_scope
  before update on public.assignment_submissions
  for each row execute function public.enforce_submission_write_scope();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.assignment_submissions enable row level security;

create policy "Students see their own submissions, teachers see submissions to their assignments"
  on public.assignment_submissions for select
  to authenticated
  using (
    student_id = (select auth.uid())
    or public.is_teacher_of_assignment(assignment_id)
  );

create policy "Students can submit to published assignments they're enrolled in"
  on public.assignment_submissions for insert
  to authenticated
  with check (
    student_id = (select auth.uid())
    and public.can_submit_assignment(assignment_id)
  );

create policy "The submitting student or the assignment's teacher can update a submission"
  on public.assignment_submissions for update
  to authenticated
  using (
    student_id = (select auth.uid())
    or public.is_teacher_of_assignment(assignment_id)
  )
  with check (
    student_id = (select auth.uid())
    or public.is_teacher_of_assignment(assignment_id)
  );

create policy "Students can delete their own ungraded submission"
  on public.assignment_submissions for delete
  to authenticated
  using (student_id = (select auth.uid()) and graded_at is null);
