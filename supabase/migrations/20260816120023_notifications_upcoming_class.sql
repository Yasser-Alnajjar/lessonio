-- Adds the `upcoming_class` notification type: a reminder shortly before a
-- recurring class (public.class_schedules) starts, generated alongside the
-- existing lesson/homework/review/daily types by
-- src/actions/notifications.generate.ts.

-- The original `type` check constraint was declared inline (no explicit
-- name), so its actual name depends on how Postgres auto-generated it.
-- Look it up by which column it's on rather than guessing the name, so this
-- migration doesn't depend on undocumented naming behavior.
do $$
declare
  target_constraint text;
  type_col_num smallint;
begin
  select attnum into type_col_num
  from pg_attribute
  where attrelid = 'public.notifications'::regclass
    and attname = 'type';

  select con.conname into target_constraint
  from pg_constraint con
  where con.conrelid = 'public.notifications'::regclass
    and con.contype = 'c'
    and type_col_num = any(con.conkey)
  limit 1;

  if target_constraint is not null then
    execute format('alter table public.notifications drop constraint %I', target_constraint);
  end if;
end $$;

alter table public.notifications
  add constraint notifications_type_check
    check (type in ('upcoming_lesson', 'homework_due', 'daily_reminder', 'upcoming_class', 'review_reminder'));

-- Same pattern as 20260808120017_notifications_delivery.sql: widen the
-- column default, then backfill existing rows that predate this key.
alter table public.settings
  alter column notification_preferences set default '{
    "enabledInBrowser": true,
    "enabledInEmail": false,
    "types": {
      "upcoming_lesson": true,
      "homework_due": true,
      "daily_reminder": true,
      "upcoming_class": true,
      "review_reminder": true
    }
  }'::jsonb;

update public.settings
set notification_preferences =
  jsonb_set(notification_preferences, '{types,upcoming_class}', 'true'::jsonb)
where not (notification_preferences -> 'types' ? 'upcoming_class');
