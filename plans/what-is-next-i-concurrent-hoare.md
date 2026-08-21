# Study Line — What's Next (Phases 19–22)

## Context

All 18 phases in `Study-Line-cluade-prompt.md` are checked off, but an audit of the codebase
found **one phase that was never actually implemented**, and the app has room for three
high-value additions the existing data model is already half-prepared for.

**The real gap — Study Sessions is a stub.**
[`src/actions/study-sessions.ts:10`](src/actions/study-sessions.ts:10) still carries
`TODO(Phase 10 — Study Sessions)`: `getHistory()` returns `[]`, `getSummary()` returns `null`,
and `start()`/`stop()` return `"Not implemented until Phase 10."` The history page renders
`FeaturePlaceholder`. Meanwhile four other domains query the `study_sessions` table for real:

| Consumer | Line |
|---|---|
| Statistics — weekly study time | [`statistics.ts:70`](src/actions/statistics.ts:70) |
| Dashboard — weekly summary | [`dashboard.ts:217`](src/actions/dashboard.ts:217), [`:292`](src/actions/dashboard.ts:292) |
| Gamification — XP per study hour | [`gamification.ts:77`](src/actions/gamification.ts:77) |
| Subject detail — per-subject study time | [`subjects.ts:107`](src/actions/subjects.ts:107) |

Nothing anywhere writes to that table, so every study-time chart, the weekly summary, and the
`XP_PER_STUDY_HOUR` term in [`xp.ts`](src/lib/gamification/xp.ts) are permanently zero. The DB is
ready and waiting — the migration even ships a partial index
`idx_study_sessions_running ... where ended_at is null` commented *"Fast lookup for 'is there a
session currently running' (Start/Stop timer UI)"*, and `duration_minutes` is a **generated stored
column**, so the actions only need `insert` + `update ended_at`.

Outcome: close the gap first (Phase 19), then add flashcards, grades/GPA, and a calendar feed.

**Architecture is non-negotiable** (AGENTS.md + the prompt): `page.tsx` → `ssr/` → `csr/` under
`modules/<domain>/<feature>/`, mirrored by a thin `src/app/[locale]/(app)/<domain>/<feature>/page.tsx`
that only wraps the SSR component in `Suspense` with `<PageLoader />`. SSR components are `async`,
call `Actions.<Domain>.<method>()`, apply `?? []` null defaults, and pass typed props down.
Absolute imports only. Zod on every form. No `any`.

---

## Phase 19 — Study Sessions + Focus Timer (do this first)

### 19.1 Actions

Replace the stub file and add a mutations file, mirroring
[`homework.mutations.ts`](src/actions/homework.mutations.ts) exactly (file-level `"use server"`,
local `getAuthedUserId(supabase)` helper, `revalidatePath("/", "layout")` on success,
`MutationResult` / `ActionResult` returns).

- **`src/actions/study-sessions.ts`** (`import "server-only"`) — real queries:
  - `getHistory()` → sessions joined to subject/lesson names, `started_at desc`.
  - `getSummary()` → fill `StudySessionSummary` (already typed in
    [`study-session.ts`](src/lib/types/study-session.ts)): today's minutes, this week's minutes,
    average session length, session count.
  - `getRunning()` → **new**: the single open session (`ended_at is null`) or `null`. Uses the
    existing partial index.
- **`src/actions/study-sessions.mutations.ts`** (`"use server"`) — new file:
  - `startStudySession(input: StartStudySessionInput)` — reject if a session is already running;
    `resolveSubjectId` from `lessonId` server-side (copy the helper's shape from
    `homework.mutations.ts` — never trust a client-supplied subject id).
  - `stopStudySession(id)` — set `ended_at = now()`; `duration_minutes` fills itself.
  - `cancelStudySession(id)` — delete a running session (mis-start escape hatch).
  - `logManualSession(input)` — explicit `startedAt` + `durationMinutes` for time studied offline.
- Extend `Actions.StudySessions` in [`src/actions/index.ts`](src/actions/index.ts) by re-exporting
  the mutations, same as the other domains do.

### 19.2 Types & validation

- Extend `src/lib/types/study-session.ts`: add `StudySessionWithRelations`
  (`subjectName`/`subjectColor`/`lessonTitle`, nullable — sessions survive subject deletion via
  `on delete set null`), and `LogStudySessionInput`.
- New `src/lib/validations/study-session.ts` — Zod schemas for the start and manual-log forms,
  matching the style of [`homework.ts`](src/lib/validations/homework.ts).

### 19.3 UI — new `focus` feature + real `history` view

```
modules/study-sessions/
  focus/{ssr/StudySessionsFocus.tsx, csr/StudySessionsFocusView.tsx, index.ts}
  history/{ssr, csr}          # replace the FeaturePlaceholder
  components/{FocusTimer.tsx, LogSessionDialog.tsx, SessionsTable.tsx}
src/app/[locale]/(app)/study-sessions/focus/page.tsx   # Suspense + PageLoader only
```

- **`FocusTimer`** — Pomodoro-style client component. Ticks from `startedAt` (server timestamp), so
  a refresh or a second tab never desyncs. Subject/lesson picker, start/stop/cancel, and a
  25/5 work-break cycle. Use `Geist Mono` (`font-mono`) for the countdown per the design system;
  the goldenrod `highlighter` accent is allowed here only for the streak/XP readout.
- **`SessionsTable`** — reuse the existing `DataTable` from `src/components/ui-system/`, plus
  `EmptyState` and `SearchInput`; do not build new table primitives.
- **Dashboard hook-up** — add a "Start studying" entry to the dashboard quick actions so the timer
  is reachable in one click.
- **Nav** — add `{ href: "/study-sessions/focus", key: "studySessions", icon: Timer }` to
  `NAV_ITEMS` in [`navigation.ts`](src/lib/constants/navigation.ts). Note `isActivePath` handles
  two entries per domain by comparing the *second* segment, so `focus` and `history` will highlight
  independently — no change needed there.
- **i18n** — `messages/en.json` and `messages/ar.json` have **no `studySessions` namespace yet**;
  add it to both (every other domain has one). RTL must be checked.

### 19.4 Verify the downstream unlock

After logging a session, confirm the previously-dead consumers light up: statistics weekly chart,
dashboard weekly summary, subject-detail study time, and XP/level movement from
`XP_PER_STUDY_HOUR`.

---

## Phase 20 — Flashcards & Spaced Repetition

Builds on the `REVIEW_STATUSES` enum (`not_reviewed` / `needs_review` / `reviewed`) already in
[`lesson.ts`](src/lib/types/lesson.ts) and on the existing `review_reminder` notification type,
which currently has nothing substantive to point at.

- **Migration** `supabase/migrations/<ts>_flashcards.sql` — follow the house style exactly (see
  [`20260807120009_study_sessions.sql`](supabase/migrations/20260807120009_study_sessions.sql)):
  audit columns, `set_updated_at` trigger, indexes, RLS with all four
  `user_id = (select auth.uid())` policies.
  - `flashcards` — `user_id`, `lesson_id` (cascade), `subject_id` (set null), `front`, `back`,
    SM-2 state: `ease_factor numeric default 2.5`, `interval_days int default 0`,
    `repetitions int default 0`, `due_date date`, `last_reviewed_at`.
  - `flashcard_reviews` — one row per grade, for the review-history heatmap.
  - Partial index on `(user_id, due_date)` for the "due today" queue.
- **`src/lib/flashcards/sm2.ts`** — pure, unit-testable SM-2 scheduler
  (`grade: 0..5 → {easeFactor, intervalDays, repetitions, dueDate}`), sitting alongside
  [`xp.ts`](src/lib/gamification/xp.ts) as a pure-helper sibling.
- **Module** `modules/flashcards/{deck,review}/` + `components/` — deck CRUD per subject/lesson, and
  a full-screen review runner (flip, grade Again/Hard/Good/Easy, progress ring from the UI system).
  Add a "Create flashcards" action to the lesson detail view.
- **Wire-ups**: `review_reminder` notification copy in
  [`copy.ts`](src/lib/notifications/copy.ts) points at the due-count; award XP per review session
  via a new constant in [`gamification.ts`](src/lib/constants/gamification.ts) (extend `XpCounts`
  and `computeXp` — don't invent a parallel XP path).

---

## Phase 21 — Grades & GPA

The data is already there: `exams.score` / `totalScore` with the pure
`calculateExamPercentage()` helper in [`exam.ts`](src/lib/types/exam.ts).

- **Migration** — add `grade_scale jsonb` and `credit_hours numeric` to `settings` / `subjects`
  respectively (default to a standard A–F / 4.0 scale so existing rows stay valid).
- **`src/lib/grades/`** — pure helpers: `percentageToLetter()`, `letterToGradePoints()`,
  `subjectAverage()`, `weightedGpa()`. Keep them pure so they're testable and reusable in SSR.
- **Module** `modules/grades/overview/` — per-subject average with letter grade, term GPA card,
  a Recharts grade-trend line over time, and a best/worst-subject breakdown. Reuse
  `StatisticCard` and `ChartCard` from the UI system; match the chart conventions in
  [`modules/statistics/overview/csr/`](modules/statistics/overview/csr/).
- **Settings** — a grade-scale editor under `modules/settings/`, following the existing
  `notification-preferences` feature as the template.
- Add the `grades` nav item + `grades` i18n namespace (en + ar).

---

## Phase 22 — Calendar Feed (.ics) Import & Export

Makes the app's schedule visible in Google/Apple Calendar. Reuses
`Actions.Calendar.*` and `Actions.ClassSchedules.*` for the source data.

- **`src/lib/calendar/ics.ts`** — dependency-free RFC 5545 serializer (VEVENT for lessons, exams,
  homework deadlines, and `RRULE:FREQ=WEEKLY` for recurring class schedule entries) plus a minimal
  parser for import.
- **Export route** `src/app/api/calendar/[token]/route.ts` — an unguessable per-user feed token
  (new `settings.calendar_feed_token uuid`), since calendar clients can't carry a Supabase session.
  Rate-limit it and return `text/calendar`. This is the **second** API route in the app
  (only `api/auth/callback` exists today), so keep it thin and typed.
- **Import** — an `.ics` upload in `modules/settings/data/`, next to the existing export/delete
  actions, mapping VEVENTs onto lessons or class schedule entries with a preview-and-confirm step.
- **Settings UI** — show the subscribe URL with copy-to-clipboard and a regenerate-token button.

---

## Verification (each phase)

Per the project rules, all three must pass clean before a phase is done:

```bash
npx tsc --noEmit && npx eslint . && npx next build
```

Then exercise it in the browser (dev server via the preview tools, never `bash npm run dev`):

- **Phase 19**: start a timer → refresh the page (timer must survive) → stop → confirm the row in
  `study_sessions`, then check the statistics weekly chart, dashboard weekly summary, subject-detail
  study time and XP/level all move off zero. Try to start a second concurrent session — must be
  rejected. Check `ar` locale RTL on the new views.
- **Phase 20**: create cards on a lesson, review them, confirm `due_date` advances per SM-2 and the
  due-count drives the review reminder.
- **Phase 21**: score an exam, confirm the letter grade, subject average and GPA update.
- **Phase 22**: subscribe to the feed URL in a real calendar client; round-trip an `.ics` export
  back through import.

New migrations run with `supabase db push`; regenerate types afterwards with `npm run supabase:types`
(the script already exists in `package.json`).

---

## Deliberately out of scope (flagged, not planned)

Found during the audit, worth knowing but not part of this plan:

1. **Reminders never fire on their own.** `notifications.generate.ts` runs via `after()` on page
   requests — there's no `vercel.json`, cron, or scheduled function. Daily/homework-due emails only
   send if the user already opened the app that day.
2. **"Offline support" is a banner, not offline.** `next/offline` + React Query cache only; no
   `manifest.json`, no service worker, no mutation queue. The app isn't installable.
3. **Zero tests.** No vitest/playwright anywhere. The pure helpers this plan adds
   (`sm2.ts`, `grades/`, `ics.ts`) are the natural place to start.
