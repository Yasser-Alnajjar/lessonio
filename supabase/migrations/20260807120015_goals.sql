create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  period text not null check (period in ('weekly', 'monthly')),
  target_minutes integer not null check (target_minutes > 0),
  achieved_minutes integer not null default 0 check (achieved_minutes >= 0),
  period_start date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, period, period_start)
);

comment on table public.goals is 'Matches src/lib/types/goal.ts Goal.';

create index idx_goals_user on public.goals (user_id);
create index idx_goals_user_period on public.goals (user_id, period_start desc);

create trigger set_goals_updated_at
  before update on public.goals
  for each row execute function public.set_updated_at();

alter table public.goals enable row level security;

create policy "Users can view their own goals"
  on public.goals for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can create their own goals"
  on public.goals for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users can update their own goals"
  on public.goals for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users can delete their own goals"
  on public.goals for delete
  to authenticated
  using (user_id = (select auth.uid()));
