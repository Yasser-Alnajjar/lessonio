create table public.lesson_notes (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  content_markdown text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_vector tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(content_markdown, '')), 'B')
  ) stored
);

comment on table public.lesson_notes is 'Matches src/lib/types/lesson-note.ts LessonNote.';

create index idx_lesson_notes_lesson on public.lesson_notes (lesson_id);
create index idx_lesson_notes_user on public.lesson_notes (user_id);
create index idx_lesson_notes_search on public.lesson_notes using gin (search_vector);

create trigger set_lesson_notes_updated_at
  before update on public.lesson_notes
  for each row execute function public.set_updated_at();

alter table public.lesson_notes enable row level security;

create policy "Users can view their own notes"
  on public.lesson_notes for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can create their own notes"
  on public.lesson_notes for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users can update their own notes"
  on public.lesson_notes for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users can delete their own notes"
  on public.lesson_notes for delete
  to authenticated
  using (user_id = (select auth.uid()));
