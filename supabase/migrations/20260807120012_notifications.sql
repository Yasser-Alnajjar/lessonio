create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (
    type in ('upcoming_lesson', 'homework_due', 'daily_reminder', 'review_reminder')
  ),
  title text not null,
  body text not null,
  read_at timestamptz,
  link_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.notifications is
  'Matches src/lib/types/notification.ts Notification. Rows are written by '
  'trusted server-side logic (Phase 14), never inserted by the client directly '
  '— see the RLS policies below, which grant select/update but not insert/delete.';

create index idx_notifications_user on public.notifications (user_id);
create index idx_notifications_unread on public.notifications (user_id) where read_at is null;

create trigger set_notifications_updated_at
  before update on public.notifications
  for each row execute function public.set_updated_at();

alter table public.notifications enable row level security;

create policy "Users can view their own notifications"
  on public.notifications for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Covers "mark as read" only in practice (see Actions.Notifications.markAsRead);
-- there's no column-level RLS in Postgres, so this trusts the server action to
-- only ever touch read_at.
create policy "Users can update their own notifications"
  on public.notifications for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Intentionally no insert/delete policy for `authenticated`: notifications
-- are created by trusted server-side logic using the service role.
