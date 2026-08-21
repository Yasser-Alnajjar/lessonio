-- ---------------------------------------------------------------------------
-- Phase 3 of plans/adding-teachers-to-lessonio.md: assignments. See that
-- file for the full design.
--
-- Assignments do not materialize into public.homework — homework.lesson_id
-- and homework.subject_id are both NOT NULL FKs to student-owned rows, and
-- homework is fully student-writable, so a materialized copy could be
-- deleted by the student it was assigned to. Assignments stay in this table
-- and surface on /homework/list as a separate, read-only "From your
-- teachers" section. Nothing in this migration adds a policy to lessons,
-- lesson_notes, attachments, flashcards, study_sessions, homework, exams,
-- subjects, classes, class_occurrences, goals, user_achievements,
-- notifications, settings, or tags.
--
-- Drafts are invisible to students; publishing an assignment is what
-- "assigning work" means. status flips draft -> published (and back) via
-- plain client UPDATEs, not an RPC, since the UPDATE policy below already
-- scopes writes to the owning teacher.
-- ---------------------------------------------------------------------------

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  teacher_class_id uuid not null references public.teacher_classes (id) on delete cascade,
  teacher_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  instructions text check (instructions is null or char_length(instructions) <= 5000),
  due_at timestamptz not null,
  total_points numeric(6, 2) not null check (total_points > 0),
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.assignments.due_at is
  'timestamptz, not date — students span timezones.';

comment on column public.assignments.status is
  'draft rows are only visible to the owning teacher (see the select policy '
  'below); flipping to published is what makes an assignment visible to '
  'enrolled students. Set alongside published_at by publishAssignment()/'
  'unpublishAssignment() in src/actions/assignments.mutations.ts.';

create index idx_assignments_teacher_class on public.assignments (teacher_class_id);
create index idx_assignments_teacher on public.assignments (teacher_id);

create trigger set_assignments_updated_at
  before update on public.assignments
  for each row execute function public.set_updated_at();

create or replace function public.enforce_assignment_pin()
returns trigger
language plpgsql
as $$
begin
  if new.teacher_class_id is distinct from old.teacher_class_id
    or new.teacher_id is distinct from old.teacher_id then
    raise exception 'teacher_class_id and teacher_id are immutable on assignments'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

comment on function public.enforce_assignment_pin() is
  'BEFORE UPDATE guard: the assignments UPDATE policy is teacher-of-class '
  'only, but has no column scope — this stops an update from moving an '
  'assignment to a different class or teacher mid-edit.';

create trigger enforce_assignment_pin
  before update on public.assignments
  for each row execute function public.enforce_assignment_pin();

-- ---------------------------------------------------------------------------
-- RLS. Reuses is_teacher_of_class()/is_enrolled_in_class() from
-- 20260823120000_teacher_classes.sql — never an inline subquery, same
-- anti-recursion reasoning as that migration.
-- ---------------------------------------------------------------------------
alter table public.assignments enable row level security;

create policy "Teachers see their own assignments, students see published ones"
  on public.assignments for select
  to authenticated
  using (
    public.is_teacher_of_class(teacher_class_id)
    or (status = 'published' and public.is_enrolled_in_class(teacher_class_id))
  );

create policy "Teachers can create assignments in their own classes"
  on public.assignments for insert
  to authenticated
  with check (
    teacher_id = (select auth.uid())
    and public.is_teacher_of_class(teacher_class_id)
    and public.current_app_role() = 'teacher'
  );

create policy "Teachers can update assignments in their own classes"
  on public.assignments for update
  to authenticated
  using (public.is_teacher_of_class(teacher_class_id))
  with check (public.is_teacher_of_class(teacher_class_id));

create policy "Teachers can delete assignments in their own classes"
  on public.assignments for delete
  to authenticated
  using (public.is_teacher_of_class(teacher_class_id));
