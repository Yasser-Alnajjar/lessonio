-- Restores a scheduled sweep for notifications, this time driven by
-- Supabase Cron (pg_cron + pg_net) instead of the Vercel Cron the project
-- used before 20260816120019_notifications_on_demand.sql.
--
-- The on-demand path added by that migration only regenerates a user's
-- notifications while their own session is actively polling — a real
-- problem for `upcoming_class`, whose whole point is to fire ~10 minutes
-- before a class starts even if the user isn't sitting in the app. This
-- sweep (src/actions/notifications.jobs.ts, via
-- src/app/api/cron/notifications/route.ts) covers that gap by running for
-- every user on a schedule, while the on-demand path remains as a
-- same-session fast path on top of it — the two share the
-- `settings.notifications_generated_at` throttle, so they never double up.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

-- The URL and bearer token live in Vault, not here, so no secret is ever
-- committed to this file or to git history. Before this job can run
-- successfully, create both secrets once from the Supabase SQL editor:
--
--   select vault.create_secret('https://your-app.example.com', 'cron_notifications_url');
--   select vault.create_secret('<the same value as CRON_SECRET in your env>', 'cron_notifications_secret');
--
-- Until both exist, net.http_post below simply has nothing to call — the
-- schedule itself is harmless to create first.
select
  cron.schedule(
    'notifications-sweep',
    '*/5 * * * *',
    $$
    select
      net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'cron_notifications_url') || '/api/cron/notifications',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_notifications_secret')
        ),
        body := '{}'::jsonb
      ) as request_id;
    $$
  );
