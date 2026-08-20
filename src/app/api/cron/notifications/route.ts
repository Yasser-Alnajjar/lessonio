import { timingSafeEqual } from "node:crypto";

import { Actions } from "@/actions";
import { getServerEnv } from "@/lib/env.server";

/**
 * Generates and delivers notifications for every user whose throttle has
 * gone stale. Triggered on a schedule by Supabase Cron — see
 * supabase/migrations/*_notifications_cron_sweep.sql, which schedules
 * `net.http_post` against this route via `pg_cron`. Safe to call by hand
 * while developing:
 *
 *   curl -H "Authorization: Bearer $CRON_SECRET" \
 *     http://localhost:3000/api/cron/notifications
 *
 * `src/proxy.ts` excludes `/api` from its matcher, so next-intl never
 * rewrites this path and there's no locale segment to account for.
 */
export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  const { CRON_SECRET } = getServerEnv();

  if (!CRON_SECRET) return false;

  const header = request.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${CRON_SECRET}`);
  const received = Buffer.from(header);

  // Length must match before timingSafeEqual, which throws on a mismatch —
  // compare lengths first, then the bytes in constant time.
  return received.length === expected.length && timingSafeEqual(received, expected);
}

async function handle(request: Request): Promise<Response> {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await Actions.Notifications.runScheduledJob();

    return Response.json(summary, {
      // A run that touched every user but hit per-user errors is still a
      // successful run; the summary carries the detail.
      status: 200,
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "The notifications job failed.";
    return Response.json({ error: message }, { status: 500 });
  }
}

// Supabase Cron dispatches scheduled net.http_post calls as POST; GET stays
// for the curl one-liner above and any future switch to Vercel-style cron.
export const GET = handle;
export const POST = handle;
