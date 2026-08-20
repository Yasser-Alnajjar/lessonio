-- Splits the Lesson/Class domain model: `lessons` stops carrying real-world
-- class-session fields (attendance_status, exam_status, teacher, location,
-- time, duration_minutes) — those move to the new `classes` table, and a
-- Lesson gains a nullable `class_id` link back to the occurrence it was
-- studied from, if any.

alter table public.lessons
  add column class_id uuid references public.classes (id) on delete set null;

create index idx_lessons_class on public.lessons (class_id);

-- One Class per existing Lesson, preserving every value that's moving, then
-- link the Lesson back to it via a temporary correlation column so the
-- mapping stays unambiguous even though `classes` has no natural key back
-- to `lessons`.
alter table public.classes add column source_lesson_id uuid;

insert into public.classes (
  user_id, subject_id, date, start_time, duration_minutes,
  teacher, location, attendance_status, exam_status,
  created_at, updated_at, source_lesson_id
)
select user_id, subject_id, date, "time", duration_minutes,
       teacher, location, attendance_status, exam_status,
       created_at, updated_at, id
from public.lessons;

update public.lessons l
set class_id = c.id
from public.classes c
where c.source_lesson_id = l.id;

alter table public.classes drop column source_lesson_id;

-- lessons.search_vector is a *generated* column over title/teacher/location
-- (20260807120005_lessons.sql), and idx_lessons_search is a GIN index on it.
-- Postgres cannot alter a generation expression, so the column is dropped and
-- recreated as title-only before the source columns disappear below.
drop index public.idx_lessons_search;

alter table public.lessons drop column search_vector;

alter table public.lessons add column search_vector tsvector generated always as (
  setweight(to_tsvector('english', coalesce(title, '')), 'A')
) stored;

create index idx_lessons_search on public.lessons using gin (search_vector);

alter table public.lessons
  drop column attendance_status,
  drop column exam_status,
  drop column teacher,
  drop column location,
  drop column "time",
  drop column duration_minutes;

comment on table public.lessons is
  'Matches src/lib/types/lesson.ts Lesson. A self-managed study item the '
  'student creates — title, study/review/homework status, tags/notes/'
  'attachments/flashcards — with its own independent date (when they '
  'studied/tracked it). class_id optionally links to public.classes (the '
  'real-world scheduled class session) but a Lesson never requires one. '
  'tagIds on the TS type is assembled from lesson_tags at query time, not '
  'stored on this row.';
