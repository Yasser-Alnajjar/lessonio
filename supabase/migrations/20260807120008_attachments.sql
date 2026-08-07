create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('image', 'pdf', 'video', 'audio')),
  file_name text not null,
  storage_path text not null unique,
  size_bytes bigint not null check (size_bytes >= 0),
  mime_type text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.attachments is
  'Matches src/lib/types/attachment.ts Attachment. publicUrl is derived at '
  'query time from storage_path (see the "attachments" bucket policies), not stored.';

create index idx_attachments_lesson on public.attachments (lesson_id);
create index idx_attachments_user on public.attachments (user_id);

create trigger set_attachments_updated_at
  before update on public.attachments
  for each row execute function public.set_updated_at();

alter table public.attachments enable row level security;

create policy "Users can view their own attachments"
  on public.attachments for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can create their own attachments"
  on public.attachments for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users can update their own attachments"
  on public.attachments for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users can delete their own attachments"
  on public.attachments for delete
  to authenticated
  using (user_id = (select auth.uid()));
