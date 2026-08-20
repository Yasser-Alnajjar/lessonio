-- Fixes notification generation being completely broken: every insert in
-- notifications.generate.ts / notifications.jobs.ts does
--   .upsert(pending, { onConflict: "user_id,dedupe_key", ignoreDuplicates: true })
-- which PostgREST translates to `ON CONFLICT (user_id, dedupe_key) DO NOTHING`
-- — a conflict target with no predicate. Postgres can only infer a *partial*
-- unique index (idx_notifications_dedupe, added in
-- 20260808120017_notifications_delivery.sql with `where dedupe_key is not
-- null`) when the ON CONFLICT clause's predicate matches exactly, and
-- PostgREST's `on_conflict` option has no way to express one. Every insert
-- has therefore failed with "there is no unique or exclusion constraint
-- matching the ON CONFLICT specification" since that migration — silently
-- swallowed by ensureNotificationsForUser()'s catch block on the on-demand
-- path, and surfaced only in the cron sweep's per-user summary.errors.
--
-- No code path ever inserts a null dedupe_key (every generated notification
-- sets one — see the `add()` helpers in notifications.generate.ts and
-- notifications.jobs.ts), so the partial predicate was never load-bearing.
-- Replacing it with a full unique index makes it a valid ON CONFLICT target.
drop index public.idx_notifications_dedupe;

create unique index idx_notifications_dedupe
  on public.notifications (user_id, dedupe_key);

comment on index public.idx_notifications_dedupe is
  'Backs the (user_id, dedupe_key) ON CONFLICT target used by every '
  'notification upsert. Must stay a full (non-partial) unique index — '
  'PostgREST''s upsert on_conflict option cannot express a predicate, so a '
  'partial index here cannot be inferred and every insert fails.';
