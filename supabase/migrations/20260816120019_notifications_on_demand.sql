-- Notifications stop being produced by a scheduled all-users job and are
-- instead generated for the signed-in user, on demand, whenever that user
-- reads their notifications (see src/actions/notifications.generate.ts).
--
-- Two things have to change for that. The generation now runs under the
-- user's own session rather than the service role, so it needs an insert
-- policy; and the read path fires every time the bell polls, so there has to
-- be somewhere to record when generation last ran.

-- The old job wrote through the service role precisely because this policy
-- did not exist. The trade-off reverses now that the work is per-user: a
-- client forging a row straight against PostgREST can only pollute its own
-- notification list, which is a far smaller blast radius than putting a
-- service-role key on the request path.
create policy "Users can insert their own notifications"
  on public.notifications for insert
  to authenticated
  with check (user_id = (select auth.uid()));

comment on table public.notifications is
  'Matches src/lib/types/notification.ts Notification. Rows are derived from '
  'the user''s own lessons and homework by ensureNotificationsForUser(), which '
  'runs under that user''s session — see the insert policy added in '
  '20260816120019_notifications_on_demand.sql.';

alter table public.settings
  add column notifications_generated_at timestamptz;

comment on column public.settings.notifications_generated_at is
  'When notifications were last generated for this user. The read path '
  'compare-and-sets this before generating, so a bell polling once a minute '
  'does the work once per refresh interval instead of once per poll.';

-- Supersedes the delivery migration's note about an hourly re-run: dedupe_key
-- now absorbs a variable number of on-demand runs per day rather than a fixed
-- 24. Its job is unchanged — one notification per (user, subject, occurrence),
-- however many times generation happens to fire.
comment on column public.notifications.dedupe_key is
  'Stable per-(user, subject, occurrence) key, e.g. homework_due:<homework_id>:<deadline>. '
  'Generation upserts on (user_id, dedupe_key) ignoring duplicates, so re-running '
  'over unchanged data creates nothing. Null is allowed so a one-off notification '
  'can skip deduplication entirely.';
