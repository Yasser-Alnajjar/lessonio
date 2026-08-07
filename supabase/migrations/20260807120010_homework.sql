create table public.homework (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  deadline date not null,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.homework is 'Matches src/lib/types/homework.ts Homework.';

create index idx_homework_user on public.homework (user_id);
create index idx_homework_lesson on public.homework (lesson_id);
create index idx_homework_user_deadline on public.homework (user_id, deadline);
create index idx_homework_pending on public.homework (user_id, deadline) where not completed;

create trigger set_homework_updated_at
  before update on public.homework
  for each row execute function public.set_updated_at();

alter table public.homework enable row level security;

create policy "Users can view their own homework"
  on public.homework for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can create their own homework"
  on public.homework for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users can update their own homework"
  on public.homework for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users can delete their own homework"
  on public.homework for delete
  to authenticated
  using (user_id = (select auth.uid()));
