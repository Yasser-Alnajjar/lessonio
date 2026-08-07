create table public.exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  date date not null,
  score numeric(6, 2) check (score is null or score >= 0),
  total_score numeric(6, 2) not null check (total_score > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  percentage numeric(5, 2) generated always as (
    case when score is not null then round((score / total_score) * 100, 2) else null end
  ) stored,
  constraint exams_score_within_total check (score is null or score <= total_score)
);

comment on table public.exams is
  'Matches src/lib/types/exam.ts Exam. percentage mirrors calculateExamPercentage() '
  'at the DB level so it is available for sorting/filtering in SQL too.';

create index idx_exams_user on public.exams (user_id);
create index idx_exams_lesson on public.exams (lesson_id);
create index idx_exams_user_date on public.exams (user_id, date);

create trigger set_exams_updated_at
  before update on public.exams
  for each row execute function public.set_updated_at();

alter table public.exams enable row level security;

create policy "Users can view their own exams"
  on public.exams for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can create their own exams"
  on public.exams for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users can update their own exams"
  on public.exams for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users can delete their own exams"
  on public.exams for delete
  to authenticated
  using (user_id = (select auth.uid()));
