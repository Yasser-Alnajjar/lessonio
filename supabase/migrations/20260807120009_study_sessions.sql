create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Detached rather than cascade-deleted: study time already logged should
  -- survive a subject/lesson being deleted later.
  subject_id uuid references public.subjects (id) on delete set null,
  lesson_id uuid references public.lessons (id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_minutes integer generated always as (
    case
      when ended_at is not null
        then ceil(extract(epoch from (ended_at - started_at)) / 60)::integer
      else null
    end
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint study_sessions_ended_after_started check (ended_at is null or ended_at >= started_at)
);

comment on table public.study_sessions is 'Matches src/lib/types/study-session.ts StudySession.';

create index idx_study_sessions_user on public.study_sessions (user_id);
create index idx_study_sessions_user_started on public.study_sessions (user_id, started_at desc);
create index idx_study_sessions_subject on public.study_sessions (subject_id);
create index idx_study_sessions_lesson on public.study_sessions (lesson_id);
-- Fast lookup for "is there a session currently running" (Start/Stop timer UI).
create index idx_study_sessions_running on public.study_sessions (user_id) where ended_at is null;

create trigger set_study_sessions_updated_at
  before update on public.study_sessions
  for each row execute function public.set_updated_at();

alter table public.study_sessions enable row level security;

create policy "Users can view their own study sessions"
  on public.study_sessions for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can create their own study sessions"
  on public.study_sessions for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users can update their own study sessions"
  on public.study_sessions for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users can delete their own study sessions"
  on public.study_sessions for delete
  to authenticated
  using (user_id = (select auth.uid()));
