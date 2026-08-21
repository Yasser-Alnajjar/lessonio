# Consolidate Schedule + Class into one recurring Class domain

## Context

Commit `dc62fbc` split the class domain into two user-facing concepts that are really one thing:

| Concept | Table | Route | Nav item |
|---|---|---|---|
| Recurring weekly class | `class_schedules` | `/class-schedules/list` | "Schedule" |
| Dated occurrence (attendance + exam) | `classes` | `/classes/list` | "Classes" |

The **underlying model is already correct** — attendance/exam are occurrence-level ([20260820150000_classes.sql:11-14](supabase/migrations/20260820150000_classes.sql)), weekly recurrence already materializes automatically ([classes.generate.ts:97](src/actions/classes.generate.ts:97)), and the dashboard already reads occurrences ([dashboard.ts:58](src/actions/dashboard.ts:58)). The defects are:

1. **Two pages / two nav entries** for one domain ("Classes" + "Schedule").
2. **Inverted naming** — the table called `classes` is the *occurrence*; the recurring class is hidden behind `class_schedules`.
3. **`starts_on` is required** (`NOT NULL`) plus an optional `ends_on`, so a class does not simply "repeat every week forever".
4. **Standalone one-off occurrences** exist (`class_schedule_id` nullable, `ClassFormDialog` creates them), which is a second way to create a class.

Outcome: one `Class` entity that *is* the recurring weekly definition, one `ClassOccurrence` child holding per-date attendance/exam, one page, one nav item.

**`lessons` is explicitly out of scope.** Its pages, nav entry, features, notes/attachments/flashcards/homework/exams/tags/study-sessions relationships are untouched. The only lessons change is a mechanical FK column rename forced by the table rename (see §2.4) — no redesign, no deletion, no merge.

---

## 1. Target domain model

```
classes                        (recurring — was class_schedules)
├── id, user_id, subject_id
├── teacher, location
├── meetings jsonb  [{ dayOfWeek, startTime, durationMinutes }, ...]
├── is_active                  (pause without deleting)
└── repeats weekly, indefinitely — no starts_on / ends_on
      ↓  materialized by ensureClassOccurrencesForUser()
class_occurrences              (was classes)
├── id, user_id, subject_id
├── class_id  NOT NULL → classes(id) ON DELETE CASCADE
├── date, start_time, duration_minutes   (snapshot at materialization)
├── attendance_status  null | attended | absent | late | cancelled
└── exam_status        none | upcoming | completed
```

Design notes:
- `meetings` keeps the existing multi-day JSONB array — a class can meet Mon 16:00 *and* Thu 06:00. The user's single-day examples are a subset of this; no reason to regress it.
- `start_time` / `duration_minutes` **stay on the occurrence**. They are a deliberate snapshot ([classes.generate.ts:88-92](src/actions/classes.generate.ts:88)) so editing a class's time never rewrites history, and every read path (dashboard, calendar, notifications, statistics) reads them directly instead of re-deriving the weekday's meeting entry.
- `teacher` / `location` are **dropped from the occurrence** — they are class-level attributes, read through the join. This removes the only real duplication.
- `class_id` becomes `NOT NULL` + `ON DELETE CASCADE`: an occurrence cannot exist without its class, and deleting a class removes its occurrences. Standalone one-off classes go away.

---

## 2. Database — one migration

New file `supabase/migrations/20260820160000_classes_consolidation.sql`. **Order matters** — rename the occurrence table first to free the `classes` name.

### 2.1 `classes` → `class_occurrences`
```sql
alter table public.classes rename to class_occurrences;
alter table public.class_occurrences rename column class_schedule_id to class_id;
```
Then rename the dependents (Postgres does **not** cascade these):
- indexes `idx_classes_user|_subject|_user_date` → `idx_class_occurrences_*`
- `idx_classes_schedule_occurrence` → `idx_class_occurrences_class_date`
- drop `idx_classes_user_teacher` (teacher column is going away)
- trigger `set_classes_updated_at` → `set_class_occurrences_updated_at`
- `settings.classes_materialized_at` → `settings.class_occurrences_materialized_at`

### 2.2 Backfill standalone occurrences, then tighten the FK
Rows with `class_id is null` were created by the old one-off form. For each distinct `(user_id, subject_id, teacher, location)` group, insert one recurring class built from the distinct `(weekday, start_time, duration_minutes)` of those rows, with **`is_active = false`** so it preserves the history without silently starting to generate new weekly occurrences. Then:
```sql
alter table public.class_occurrences
  alter column class_id set not null,
  drop column teacher,
  drop column location;
-- re-point the FK to ON DELETE CASCADE
```
Rebuild `idx_class_occurrences_class_date` as a plain (non-partial) unique index on `(class_id, date)` now that `class_id` is `NOT NULL`.

### 2.3 `class_schedules` → `classes`
```sql
alter table public.class_schedules rename to classes;
alter table public.classes rename column schedules to meetings;
alter table public.classes drop column starts_on, drop column ends_on;
alter function public.validate_class_schedule_entries(jsonb)
  rename to validate_class_meetings;
```
Rename constraint `class_schedules_schedules_valid` → `classes_meetings_valid`, indexes `idx_class_schedules_*` → `idx_classes_*`, trigger → `set_classes_updated_at`. Add `idx_classes_user_teacher` (partial, `where teacher is not null`) — [search/query.ts:56-62](src/lib/search/query.ts:56) queries teachers and now correctly hits the recurring table, where each teacher appears once instead of once per occurrence. Refresh all table/column comments to point at the new TS type files.

### 2.4 Lessons FK (mechanical only)
```sql
alter table public.lessons rename column class_id to class_occurrence_id;
```
Required because `lessons.class_id` would otherwise read as pointing at the new `classes` table while actually pointing at `class_occurrences`. The FK target follows the table rename automatically; the relationship, behavior, UI and Lessons pages are unchanged.

### 2.5 Reissue `sync_user_achievements()` — **critical**
The function body from [20260820150002_gamification_attendance_from_classes.sql:82-89](supabase/migrations/20260820150002_gamification_attendance_from_classes.sql) reads `public.classes` for `attendance_status`. plpgsql resolves table names at execution, so after the rename it would silently target the recurring table and fail at runtime. Re-`create or replace` it reading `public.class_occurrences`, otherwise unchanged.

Finish with `npm run supabase:types` to regenerate [database.ts](src/lib/types/database.ts).

---

## 3. Types

| Action | File |
|---|---|
| Rewrite as the **recurring Class** | [src/lib/types/class.ts](src/lib/types/class.ts) — `WEEKDAYS`, `Weekday`, `ClassMeeting` (was `ClassScheduleEntry`), `Class`, `ClassWithSubject`, `CreateClassInput`, `UpdateClassInput`. No `startsOn`/`endsOn`. |
| New — the **occurrence** | `src/lib/types/class-occurrence.ts` — moves `ATTENDANCE_STATUSES`, `AttendanceStatus`, `CLASS_EXAM_STATUSES`, `ClassExamStatus` out of the old `class.ts`, plus `ClassOccurrence`, `ClassOccurrenceWithRelations`, `UpdateClassOccurrenceInput`, `ClassOccurrenceFilters`. No `teacher`/`location`; add `className`-style joined fields alongside the existing `subjectName/subjectColor/subjectIcon`. |
| Delete | [src/lib/types/class-schedule.ts](src/lib/types/class-schedule.ts) |
| Fix barrel | [src/lib/types/index.ts](src/lib/types/index.ts) — currently exports `./class-schedule` but **not** `./class`; export `./class` and `./class-occurrence`. |
| Rename field | [src/lib/types/lesson.ts](src/lib/types/lesson.ts) — `classId` → `classOccurrenceId`. |
| Update | [src/lib/types/dashboard.ts](src/lib/types/dashboard.ts), [src/lib/types/calendar.ts](src/lib/types/calendar.ts) — `ClassWithRelations` → `ClassOccurrenceWithRelations`. |

---

## 4. Actions

Follows the existing two-file-per-domain convention (`<domain>.ts` = `server-only` reads, `<domain>.mutations.ts` = `"use server"`, re-exported by the first).

| From | To | Change |
|---|---|---|
| `class-schedules.ts` | `classes.ts` | `classesActions` — recurring reads; drop `starts_on`/`ends_on` from selects and mappers. |
| `class-schedules.mutations.ts` | `classes.mutations.ts` | `createClass` / `updateClass` / `toggleActiveClass` / `deleteClass`. Drop `startsOn`/`endsOn` handling ([:56-57](src/actions/class-schedules.mutations.ts), [:80-81](src/actions/class-schedules.mutations.ts)). `deleteClass` no longer needs the pre-delete occurrence sweep — `ON DELETE CASCADE` handles it. |
| `classes.ts` (old) | `class-occurrences.ts` | `classOccurrencesActions` — `getAll(filters)`, `getById`, plus a `getUpcoming()` used by both the list page and the dashboard. Join `classes` for teacher/location. |
| `classes.mutations.ts` (old) | `class-occurrences.mutations.ts` | **Only `updateClassOccurrenceStatus(id, { attendanceStatus, examStatus })` survives.** `createClass`/`deleteClass` (one-offs) are deleted. Validate the two status values against `ATTENDANCE_STATUSES`/`CLASS_EXAM_STATUSES` before writing — this is unvalidated client input today ([classes.mutations.ts:74-75](src/actions/classes.mutations.ts)). |
| `classes.generate.ts` | `class-occurrences.generate.ts` | `ensureClassOccurrencesForUser`, `deleteFutureUntouchedOccurrences`. Remove the `starts_on`/`ends_on` range clamping ([:118-122](src/actions/classes.generate.ts)) — the window is now unconditionally `today ± WINDOW_DAYS`. Stop copying `teacher`/`location` into inserts. Update the lessons link check to `class_occurrence_id`. |

Also update:
- [src/actions/index.ts](src/actions/index.ts) — `Actions.Classes` (recurring) + `Actions.ClassOccurrences`; remove `Actions.ClassSchedules`.
- [src/actions/dashboard.ts:58-101](src/actions/dashboard.ts:58) — read `class_occurrences`; **fix the existing bug** where today+upcoming are sliced out of one shared `limit(30)`, so a busy day empties "Upcoming". Query the two buckets separately (`date = today`, `date > today limit 5`).
- [src/actions/calendar.ts:24-28](src/actions/calendar.ts:24) — `classesActions.getAll` → `classOccurrencesActions.getAll`.
- [src/actions/statistics.ts](src/actions/statistics.ts), [src/actions/subjects.ts](src/actions/subjects.ts) — attendance aggregations read `class_occurrences`.
- [src/actions/notifications.generate.ts:216](src/actions/notifications.generate.ts:216) — the `upcoming_class` query reads `class_occurrences` joined to `classes` for teacher/location. Everything else (lead time, dedupe key, `ensureClassOccurrencesForUser` call at `:183`) stays — reusing the existing on-demand generator as agreed.
- [src/actions/settings.mutations.ts:107-164](src/actions/settings.mutations.ts:107) — add `classes` and `class_occurrences` to the data export, which currently omits both.

---

## 5. Validation

- [src/lib/validations/class-schedule.ts](src/lib/validations/class-schedule.ts) → `src/lib/validations/class.ts`, exporting `createClassSchema(t)` — `subjectId`, `meetings[]` (min 1, no duplicate weekday), `teacher`, `location`, `isActive`. **Delete** `startsOn`, `endsOn` and the `.refine()` end-date check.
- Delete the old occurrence-create schema in `src/lib/validations/class.ts` — occurrences are never user-created.

---

## 6. UI — one page, one nav item

### Routes
- **Keep** `src/app/[locale]/(app)/classes/list/page.tsx` — the single page.
- **Repurpose** `src/app/[locale]/(app)/classes/detail/[classId]/page.tsx` — now a *recurring class* detail (its meetings + its occurrence history with per-date controls), replacing today's occurrence-detail page.
- **Delete** `src/app/[locale]/(app)/class-schedules/`.

### Module — `modules/classes/` becomes the only module
```
modules/classes/
├── index.ts
├── list/
│   ├── ssr/ClassesList.tsx        Promise.all([ClassOccurrences.getUpcoming(), Classes.getAll(), Subjects.getAll()])
│   └── csr/ClassesListView.tsx    Today → Upcoming → Weekly schedule
├── detail/
│   ├── ssr/ClassesDetail.tsx      Classes.getById + its occurrences
│   └── csr/ClassesDetailView.tsx
└── components/
    ├── ClassFormDialog.tsx            ← from ClassScheduleFormDialog (recurring form, minus start/end dates)
    ├── ClassActionsMenu.tsx           ← from ClassScheduleActionsMenu (edit / pause / delete)
    ├── DeleteClassDialog.tsx          ← warns that occurrences + attendance history cascade
    └── ClassOccurrenceStatusControls.tsx  ← from ClassStatusControls
```
**Delete** `modules/class-schedules/` entirely and drop `ClassSchedules` from [modules/index.ts](modules/index.ts).

### `ClassesListView` layout (chosen option: occurrences on top, schedule below)
1. **Today / حصص اليوم** — occurrence cards with inline Attendance + Exam `Select`s, wired to `updateClassOccurrenceStatus` via the existing `useTransition` + `router.refresh()` pattern from [ClassStatusControls.tsx:52-67](modules/classes/components/ClassStatusControls.tsx:52).
2. **Upcoming / الحصص القادمة** — next occurrences, read-only status badges.
3. **Weekly schedule / الجدول الأسبوعي** — recurring class cards grouped by weekday, each with edit / pause / delete. Primary "New class" button lives in the page header.

Keep the existing `SearchInput` + `FilterSidebar` on the occurrence sections ([ClassesListView.tsx:110-127](modules/classes/list/csr/ClassesListView.tsx:110)) so filtering by subject/attendance/date is preserved.

### Shared components
- Rename `src/components/ui-system/class-card.tsx` → `class-occurrence-card.tsx` (`ClassOccurrenceCard`); drop teacher/location props in favour of the joined class fields.
- Move `ClassScheduleCard` into `modules/classes/components/RecurringClassCard.tsx`.
- Add **both** to [src/components/ui-system/index.ts](src/components/ui-system/index.ts) — `class-card` is currently missing from the barrel and deep-imported.
- [status-badge.tsx:95-100](src/components/ui-system/status-badge.tsx:95) — `CLASS_STATUS_KINDS` keeps routing attendance/exam to the `classes.status.*` i18n namespace; no change needed.
- [modules/dashboard/overview/csr/class-list-card.tsx](modules/dashboard/overview/csr/class-list-card.tsx) — swap to `ClassOccurrenceCard`; the dashboard's Today/Upcoming sections already carry the right names.

### Navigation
- [src/lib/constants/navigation.ts:34-35](src/lib/constants/navigation.ts:34) — **remove** the `schedule` entry; keep exactly one `{ href: "/classes/list", key: "classes", icon: CalendarClock }`. `isActivePath` needs no change: with a single href under `/classes`, the `siblings.length <= 1` shortcut ([:64-65](src/lib/constants/navigation.ts:64)) already highlights detail routes.
- **Delete** [src/components/shared/nav-bar.tsx](src/components/shared/nav-bar.tsx) — unreferenced dead code carrying a second, divergent `NAV_ITEMS` and a duplicated `isActivePath`, exactly the duplicate-nav problem this refactor removes.

---

## 7. i18n

- Fold the whole `classSchedules.*` namespace into `classes.*` in [messages/en.json](messages/en.json) and [messages/ar.json](messages/ar.json); delete `classSchedules`.
- `nav.classes` = **"Classes" / "الحصص الدراسية"**; remove `nav.schedule`.
- Add `classes.list.today` (حصص اليوم), `classes.list.upcoming` (الحصص القادمة), `classes.list.weeklySchedule` (الجدول الأسبوعي).
- Move `classSchedules.days.*` under `classes.days.*`; move `src/lib/constants/class-schedules.ts` (`WEEKDAY_LABEL_KEYS`) → `src/lib/constants/classes.ts` and repoint the keys.
- Remove `form.startsOn*` / `form.endsOn*` labels and the `errors.startsOnRequired` / `errors.endsOnInvalid` messages.
- Keep `classes.status.attendance.*` and `classes.status.exam.*` as-is.
- [src/lib/notifications/copy.ts:160,170](src/lib/notifications/copy.ts:160) — `upcomingClassCopy` currently links `ar` to `/classes/list` but `en` to `/class-schedules/list`. Both become `/classes/list`.
- **Do not touch** the `lessons.*` namespace. (Its `list.subtitle` / `list.emptyDescription` still carry stale pre-split copy about attendance — noted, left alone as out of scope.)

---

## 8. Verification

There is no test runner in this repo — verification is types, lint, a clean DB rebuild, and a browser walkthrough.

```bash
npx supabase db reset && npm run supabase:types && npm run typecheck && npm run lint
```

`db reset` replays all 30 migrations from scratch and is the real check that the rename ordering, index/trigger renames, backfill and the reissued `sync_user_achievements()` are all valid.

Then via the Browser pane (`preview_start` with `study-line-dev`, port 3000):

| Check | How |
|---|---|
| One nav entry | Sidebar shows **Classes / الحصص الدراسية** only — no "Schedule", no second class entry. `/class-schedules/list` 404s. |
| Create recurring class | New class → Math, Monday 16:00. Form has **no start/end date fields**. |
| Weekly recurrence | Occurrences appear for this Monday *and* following Mondays with no further input; a second class (Physics, Thursday 06:00) generates independently. |
| Occurrence-scoped attendance | Set this week's Math to `attended` / exam `none`; confirm next week's Math occurrence still reads *not recorded* / `none`. Reload to confirm persistence. |
| No inheritance across weeks | Set next week's Math to `absent` / `upcoming`; this week's stays `attended` / `none`. |
| Dashboard | Today's Classes / Upcoming Classes populate from the same occurrences; verify a day with many classes still shows Upcoming (the `limit(30)` bug fix). |
| Edit / pause / delete | Edit the class time → future untouched occurrences regenerate, the marked one survives. Pause → no new future occurrences. Delete → class and its occurrences cascade. |
| Notifications | With a class starting inside the 10-minute lead window, the bell produces an `upcoming_class` notice linking to `/classes/list`. |
| Lessons unaffected | `/lessons/list` and `/lessons/detail/[id]` render; the linked-class picker still resolves. |
| Calendar & statistics | `/calendar/month` shows classes; `/statistics/overview` attendance breakdown is non-zero. |
| RTL | Switch to Arabic and re-check the Classes page layout. |

Grep gate before finishing — these must return nothing outside the migration file:
```bash
grep -rn "class_schedule\|classSchedule\|ClassSchedule\|class-schedules" src modules messages
```

---

## 9. Risks & assumptions

- **`starts_on` / `ends_on` are dropped, not nullable.** Any date-bounded schedule loses its bound and becomes indefinite. This follows directly from "a recurring Class repeats every week" and "do not implement a finite start/end date model"; if bounded terms are ever needed, they come back as a deliberate feature.
- **Deleting a class now cascades its occurrences and attendance history**, where previously `on delete set null` orphaned them as standalone rows. Orphans are impossible under `class_id NOT NULL`, so the delete dialog must say so.
- **Existing standalone one-off occurrences** are converted to paused (`is_active = false`) recurring classes so their attendance history survives. If the DB has none, the backfill is a no-op.
- **`sync_user_achievements()` is the sharpest edge** — a plpgsql function referencing `public.classes` by name that silently retargets after the rename. Covered by §2.5 and by `db reset`.
- The rename touches ~30 files. `npm run typecheck` under this repo's strict config (`noUncheckedIndexedAccess`, `noUnusedLocals`) is the safety net for the mechanical parts; the DB function and the raw `.from("...")` string literals are the parts TypeScript cannot catch, so the grep gate above covers them.
- Notifications remain best-effort on-demand (fire only while the app is open, ~10-minute lead). Unchanged by design per your answer; a real 30-minutes-ahead push would need cron or Web Push and is out of scope.
