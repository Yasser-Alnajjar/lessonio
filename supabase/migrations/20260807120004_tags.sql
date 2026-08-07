create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

comment on table public.tags is 'Matches src/lib/types/tag.ts Tag.';

create index idx_tags_user on public.tags (user_id);

create trigger set_tags_updated_at
  before update on public.tags
  for each row execute function public.set_updated_at();

alter table public.tags enable row level security;

create policy "Users can view their own tags"
  on public.tags for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can create their own tags"
  on public.tags for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users can update their own tags"
  on public.tags for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users can delete their own tags"
  on public.tags for delete
  to authenticated
  using (user_id = (select auth.uid()));
