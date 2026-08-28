-- Phase 5 (#4) of plans/adding-teachers-to-lessonio.md: an optional link
-- from a student's own recurring class (public.classes) to one of the
-- teacher_classes they're enrolled in.
--
-- This is deliberately the reverse direction of every other cross-domain
-- reference in this feature: it does not grant a teacher any new visibility
-- (public.classes keeps its untouched `user_id = auth.uid()` policies,
-- unmodified by this migration), and it does not materialize a teacher_class
-- into the student's schedule automatically. It only lets a student who
-- already maintains their own class entry point it at the matching
-- teacher_classes row, purely for their own display. Nullable, and null by
-- default for every existing and future row.

alter table public.classes
  add column teacher_class_id uuid references public.teacher_classes (id) on delete set null;

comment on column public.classes.teacher_class_id is
  'Optional, student-set link to a teacher_classes row the student is '
  'enrolled in. Purely informational for the student''s own display — '
  'grants no new read access in either direction. NULL is the default and '
  'the common case: every class this student was already tracking before '
  'ever joining a class keeps working exactly as it does today.';

create index idx_classes_teacher_class on public.classes (teacher_class_id)
  where teacher_class_id is not null;

-- Re-uses is_enrolled_in_class() from 20260823120000_teacher_classes.sql.
-- The classes RLS policies already pin user_id = auth.uid() for every
-- insert/update on this table, so checking the *caller's* enrollment here is
-- equivalent to checking new.user_id's enrollment.
create or replace function public.enforce_class_teacher_link()
returns trigger
language plpgsql
as $$
begin
  if new.teacher_class_id is not null
    and not public.is_enrolled_in_class(new.teacher_class_id) then
    raise exception 'not enrolled in the linked teacher class' using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger enforce_class_teacher_link
  before insert or update of teacher_class_id on public.classes
  for each row execute function public.enforce_class_teacher_link();
