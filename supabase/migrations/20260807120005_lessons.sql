create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  teacher text,
  location text,
  date date not null,
  "time" time not null,
  duration_minutes integer not null check (duration_minutes > 0),
  attendance_status text not null default 'attended'
    check (attendance_status in ('attended', 'absent', 'late', 'cancelled')),
  study_status text not null default 'not_started'
    check (study_status in ('not_started', 'studying', 'completed', 'reviewed')),
  review_status text not null default 'not_reviewed'
    check (review_status in ('not_reviewed', 'needs_review', 'reviewed')),
  homework_status text not null default 'none'
    check (homework_status in ('none', 'pending', 'in_progress', 'completed')),
  exam_status text not null default 'none'
    check (exam_status in ('none', 'upcoming', 'completed')),
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_vector tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(teacher, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(location, '')), 'C')
  ) stored
);

comment on table public.lessons is
  'Matches src/lib/types/lesson.ts Lesson. tagIds on the TS type is assembled '
  'from lesson_tags at query time, not stored on this row.';

create index idx_lessons_user on public.lessons (user_id);
create index idx_lessons_subject on public.lessons (subject_id);
create index idx_lessons_user_date on public.lessons (user_id, date);
create index idx_lessons_user_active on public.lessons (user_id) where not is_archived;
create index idx_lessons_search on public.lessons using gin (search_vector);

create trigger set_lessons_updated_at
  before update on public.lessons
  for each row execute function public.set_updated_at();

alter table public.lessons enable row level security;

create policy "Users can view their own lessons"
  on public.lessons for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can create their own lessons"
  on public.lessons for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users can update their own lessons"
  on public.lessons for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users can delete their own lessons"
  on public.lessons for delete
  to authenticated
  using (user_id = (select auth.uid()));
