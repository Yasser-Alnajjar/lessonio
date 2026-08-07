create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  icon text not null check (
    icon in (
      'book-open', 'calculator', 'flask-conical', 'globe', 'landmark',
      'palette', 'code', 'music', 'dumbbell', 'languages'
    )
  ),
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.subjects is 'Matches src/lib/types/subject.ts Subject.';

create index idx_subjects_user on public.subjects (user_id);
create index idx_subjects_user_active on public.subjects (user_id) where not is_archived;

create trigger set_subjects_updated_at
  before update on public.subjects
  for each row execute function public.set_updated_at();

alter table public.subjects enable row level security;

create policy "Users can view their own subjects"
  on public.subjects for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can create their own subjects"
  on public.subjects for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users can update their own subjects"
  on public.subjects for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users can delete their own subjects"
  on public.subjects for delete
  to authenticated
  using (user_id = (select auth.uid()));
