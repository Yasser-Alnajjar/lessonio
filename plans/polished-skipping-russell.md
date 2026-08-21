# Phase 14 — Notifications

## Context

`notifications` is the last fully-stubbed vertical slice with a real table behind it.
The schema ([20260807120012_notifications.sql](supabase/migrations/20260807120012_notifications.sql))
already exists with owner-scoped RLS granting `select` + `update` but deliberately **no
`insert`/`delete`** for `authenticated` — rows are meant to be written by trusted server-side
logic. `Actions.Notifications` ([src/actions/notifications.ts](src/actions/notifications.ts)) returns
`[]` / "Not implemented until Phase 14", and the center view renders `FeaturePlaceholder`.

Phase 14 delivers the whole loop: **generate** notification rows server-side for the four
`NotificationType`s (`upcoming_lesson`, `homework_due`, `daily_reminder`, `review_reminder`),
**surface** them in-app (bell + center) and as real browser `Notification` popups, and **email**
them. Three pieces of infrastructure don't exist in this repo yet and get introduced here:
a service-role Supabase client, a cron-triggered route handler, and an email sender.

Confirmed decisions:
- **Generation** — Next.js route handler + external cron (Vercel Cron), not `pg_cron`.
- **Delivery to browser** — TanStack Query polling (already a dependency), not Supabase Realtime.
- **Email** — Resend. *You must add `RESEND_API_KEY` to `.env.local` yourself; until then the
  code is real and correct but delivery returns a clear "email is not configured" error.*

## 1. Database

New migration `supabase/migrations/20260808120017_notifications_delivery.sql`:

- `alter table public.notifications add column dedupe_key text, add column emailed_at timestamptz;`
- `create unique index idx_notifications_dedupe on public.notifications (user_id, dedupe_key) where dedupe_key is not null;`
  — this is what makes the cron job idempotent. Every hourly run upserts with
  `onConflict: "user_id,dedupe_key", ignoreDuplicates: true`, so re-running never
  double-notifies. Keys: `upcoming_lesson:<lessonId>:<date>`, `homework_due:<homeworkId>:<deadline>`,
  `daily_reminder:<yyyy-mm-dd>`, `review_reminder:<lessonId>:<yyyy-mm-dd>`.
- Extend the `settings.notification_preferences` jsonb default with `"enabledInEmail": true`,
  and `update public.settings set notification_preferences = jsonb_set(...)` for existing rows.
- Keep the no-insert/no-delete RLS posture exactly as-is. Users never delete a notification;
  they mark it read (which the existing update policy already permits).

Then hand-update `src/lib/types/database.ts` (`notifications` Row/Insert/Update gain
`dedupe_key: string | null` and `emailed_at: string | null`) — the README says this file is
hand-written to match the migrations. Add `enabledInEmail: boolean` to `NotificationPreferences`
in [src/lib/types/settings.ts](src/lib/types/settings.ts).

## 2. Server-only infrastructure

- **`src/lib/env.server.ts`** — `import "server-only"`, zod schema for `SUPABASE_SERVICE_ROLE_KEY`,
  `CRON_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`. Parsed **lazily via `getServerEnv()`**, not at
  module load like [src/lib/env.ts](src/lib/env.ts) — otherwise `next build` fails on a machine
  without the secrets. `src/lib/env.ts` stays public-only, per its own file comment.
- **`src/lib/supabase/admin.ts`** — `createAdminClient()` using the service-role key with
  `auth: { persistSession: false }`. Mirrors the doc-comment style of
  [src/lib/supabase/server.ts](src/lib/supabase/server.ts) and states plainly that it bypasses RLS
  and must never be imported from a Client Component.
- **`src/lib/email.ts`** — thin `sendEmail({ to, subject, html })` wrapper over `resend`
  (new dependency). Returns `MutationResult` and, when `RESEND_API_KEY` is absent, returns
  `{ success: false, error: "Email delivery is not configured." }` rather than throwing.

## 3. Notification copy (i18n for stored content)

**`src/lib/notifications/copy.ts`** — `buildNotificationCopy(type, locale, params)` returning
`{ title, body, linkPath }`, with `en`/`ar` records. Notification text is *persisted* in the DB,
so it must be rendered in the user's `settings.locale` at generation time. Deliberately **not**
`next-intl`'s `getTranslations` — the cron job renders copy for many users in both locales in one
pass, outside any single request's locale scope.

Per-user "today" comes from `profiles.timezone` (column already exists) via
`new Intl.DateTimeFormat("en-CA", { timeZone })` → `yyyy-mm-dd`, falling back to UTC. Zero new
deps (`date-fns-tz` is not installed).

## 4. Generation job

**`src/actions/notifications.jobs.ts`** (`import "server-only"`, admin client) exporting
`runScheduledNotificationsJob()`. One pass: load every settings row joined to its profile, then
per user, honouring `notification_preferences.types[...]`:

| Type | Rule | Reuses |
|---|---|---|
| `upcoming_lesson` | `lessons` with `date` in [today, tomorrow] | `lessons` columns `date`/`time`/`duration_minutes` ([src/actions/lessons.ts:39-58](src/actions/lessons.ts)) |
| `homework_due` | `homework` where `not completed` and `deadline <= today + 2d` | index `idx_homework_pending` already covers this exact predicate |
| `daily_reminder` | one per user per local day, body summarizing today's lesson + due-homework counts | counts computed from the two queries above |
| `review_reminder` | `lessons` with `review_status <> 'reviewed'` and `date < today - 7d`, capped per run | `REVIEW_STATUSES` ([src/lib/types/lesson.ts:19-23](src/lib/types/lesson.ts)) |

There is no spaced-repetition scheduler in this codebase, so `review_reminder` is
"you have lessons you haven't marked reviewed" — not an SRS interval.

Batched upsert per user (single round trip), then for each **newly inserted** row where the user
has `enabledInEmail`, send via `src/lib/email.ts` and stamp `emailed_at`. The job returns a
`{ scanned, created, emailed, errors }` summary; a failure for one user is collected, not fatal.

## 5. Actions

- **`src/actions/notifications.ts`** (SSR-facing) — real `getAll()` (owner-scoped, `created_at desc`,
  limit 50), `getUnreadCount()`, plus re-exports of the mutations and `runScheduledJob`. Exactly the
  shape of [src/actions/homework.ts](src/actions/homework.ts): `getAll` inline, mutations re-exported.
  Includes a `mapNotificationRow` snake→camel mapper like `mapHomeworkRow`.
- **`src/actions/notifications.mutations.ts`** (new, file-level `"use server"`) — `markAsRead(id)`,
  `markAllAsRead()`, `sendNotificationToEmail(id)`, and `getRecentNotifications()` (the poll
  endpoint the bell calls; a read living here because this file is "client-invokable server
  actions", which the file's doc comment will say). All request-scoped client + `user_id` filter, so
  RLS and the explicit `.eq("user_id", …)` both apply. `revalidatePath("/", "layout")` on writes,
  matching [homework.mutations.ts](src/actions/homework.mutations.ts).
- **`src/actions/settings.ts` / new `src/actions/settings.mutations.ts`** — implement `get()` for
  real and add `updateNotificationPreferences(prefs)`. `exportData` / `deleteAccount` keep their
  `TODO(Phase 16)` stubs untouched.

## 6. Route handler + cron

**`src/app/api/cron/notifications/route.ts`** — `export const dynamic = "force-dynamic"`; `GET`
that compares `Authorization: Bearer <CRON_SECRET>` in constant time, 401s otherwise, then calls
`Actions.Notifications.runScheduledJob()` and returns the summary as JSON. `src/proxy.ts`'s matcher
already excludes `api`, so next-intl won't rewrite it.

**`vercel.json`** — `{ "crons": [{ "path": "/api/cron/notifications", "schedule": "0 * * * *" }] }`.
Hourly is the right granularity given `lessons.date` is a date and `homework.deadline` is a date.

## 7. Client

- **`src/hooks/use-browser-notifications.ts`** (kebab-case, matching `use-mobile.ts`) — owns
  `Notification.permission` state, `requestPermission()`, `showNotification()`, and a
  `localStorage` set of already-popped notification ids so a popup fires once per notification
  across polls and reloads. No such hook exists today; this establishes the convention.
- **`src/components/shared/notification-bell.tsx`** — `"use client"`. `useQuery` on
  `getRecentNotifications` with `refetchInterval: 60_000`; unread-count badge; dropdown of the
  latest few (mark-read + navigate to `linkPath` on click, "mark all read" footer, link to the
  center). Diffs each poll against the seen-set and fires browser popups for new unread rows when
  permission is granted and `enabledInBrowser` is on.
- **[src/components/shared/nav-bar.tsx](src/components/shared/nav-bar.tsx)** — render
  `<NotificationBell />` beside `<ThemeToggle />`, and add a Notifications entry to `NAV_ITEMS`
  for the mobile sheet.
- **`modules/notifications/center/`** — SSR fetches notifications + settings and passes typed
  props; CSR replaces `FeaturePlaceholder` with the real list: all/unread tabs, grouped by day,
  per-type icon, mark-read, "email me this", and `EmptyState` from
  [src/components/ui-system](src/components/ui-system/index.ts) when empty.
- **`modules/settings/notification-preferences/`** — replaces its placeholder with the real
  control surface: browser-permission request button (showing granted/denied/default),
  `enabledInBrowser` + `enabledInEmail` switches, and the four per-type switches, saved through
  `updateNotificationPreferences`. This is the natural home for the toggles Phase 14 depends on;
  the rest of Settings stays Phase 16.

## 8. i18n + env

- Add a `"notifications"` top-level section to `messages/en.json` **and** `messages/ar.json`
  (UI chrome), plus `nav.notifications` and the notification-preferences strings. Follows the
  existing one-top-level-key-per-domain convention.
- `.env.example` gains `SUPABASE_SERVICE_ROLE_KEY=`, `CRON_SECRET=`, `RESEND_API_KEY=`, `EMAIL_FROM=`.

## Verification

1. `npm run typecheck && npm run lint` — must be clean.
2. Apply the migration (`npx supabase db reset` locally, or push to the linked project).
3. `npm run dev`, then drive the app in the browser preview:
   - Seed a lesson dated today and an incomplete homework due tomorrow.
   - Trigger generation manually:
     ```bash
     curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/notifications
     ```
     Expect a JSON summary with `created > 0`; run it a second time and expect `created: 0`
     (proves the `dedupe_key` unique index works).
   - Reload the app: bell shows an unread badge; grant the browser permission prompt and confirm
     a real OS notification fires on the next poll.
   - Open `/notifications/center` — rows render, clicking marks read and navigates via `linkPath`,
     "mark all read" zeroes the badge.
   - `/settings/notification-preferences` — toggle a type off, re-run the curl, confirm no new row
     of that type appears.
   - Check `read_console_messages` / `preview_logs` for errors, and screenshot the bell + center.
4. Email: without `RESEND_API_KEY`, "email me this" must surface "Email delivery is not
   configured" rather than crash. With a key set, confirm the message arrives and `emailed_at`
   is stamped.
5. RTL check: `resize_window` + switch to `/ar` and confirm the bell dropdown and center list
   mirror correctly.
