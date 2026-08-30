# Correct the Lesson/Class domain model

## Context

`lessons` currently conflates two different things: the student's own study item **and** the real-world scheduled class. It carries `attendance_status`, `exam_status`, `teacher`, `location`, `"time"`, and `duration_minutes` — all of which describe an external class session, not a self-managed study note. The Dashboard's "Today's lessons" / "Upcoming lessons" compounds this by presenting study items as if they were a timetable.

The repo already has `class_schedules`, but it is only a **recurring template** (subject, teacher, location, a `schedules` JSONB array of day/time/duration, `starts_on`/`ends_on`, `is_active`). It deliberately holds no per-occurrence state, so there is nowhere today to record "did I attend the Tuesday 10:00 class on Aug 18".

**Target model:**

- **Class** = an actual class session with a teacher / external schedule, on a specific date. Owns subject, date, start time, duration, teacher, location, `attendance_status`, `exam_status`, and an optional link to the `class_schedules` template that generated it. Standalone (unscheduled) classes are supported.
- **Lesson** = a self-managed study item the student creates. Keeps its own `subject_id`, its own independent `date` (when they studied/tracked it — may differ from the class date), `title`, `study_status`, `review_status`, `homework_status`, `is_archived`, tags/notes/attachments/flashcards. Gains a **nullable** `class_id`. A Lesson may link to a Class but must never require one.
- **class_schedules** is unchanged — it stays the pure recurrence definition and gains no status fields.

This is a refactor of an implemented app. No phases are restarted and no new architecture is introduced; the new `classes` module mirrors the existing `modules/class-schedules/` and `modules/lessons/` conventions exactly.

### Decisions already made

| Decision                 | Choice                                                                                                                  |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Occurrence storage       | New `classes` table; `class_schedules` untouched                                                                        |
| Lesson scheduling fields | `teacher`, `location`, `time`, `duration_minutes` all move to Class; Lesson keeps its own `date` + `subject_id`         |
| `exam_status`            | Stays a simple manual flag on Class — **not** derived from the `exams` table (pre-existing duplication is out of scope) |
| Occurrence creation      | On-demand materialization from `class_schedules`, mirroring `ensureNotificationsForUser()`                              |
| Nav naming               | New occurrences module takes "Classes"; existing `/class-schedules/list` is relabeled "Schedule"                        |

### One design consequence to confirm

`classes.attendance_status` must be **nullable**, with `NULL` = "not recorded yet". On-demand materialization creates _future_ occurrences, and a class that has not happened yet cannot be `attended`. The four status values are unchanged (`attended | absent | late | cancelled`) — the TS type becomes `AttendanceStatus | null`. This also makes "untouched occurrence" unambiguous (needed for re-materialization after a schedule edit) and fixes a latent bug: today's `default 'attended'` inflates the attendance-rate statistic for lessons nobody ever marked.

---

## 1. Migrations

House style to copy: `supabase/migrations/20260807120005_lessons.sql` (table + indexes + `set_updated_at` trigger + four RLS policies + `comment on table` pointing at the TS type) and `20260816120022_class_schedules_consolidate.sql` (add column → backfill → `set not null` → constraint).

### `20260820150000_classes.sql`

```sql
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  class_schedule_id uuid references public.class_schedules (id) on delete set null,
  date date not null,
  start_time time not null,
  duration_minutes integer not null check (duration_minutes > 0),
  teacher text,
  location text,
  attendance_status text
    check (attendance_status in ('attended','absent','late','cancelled')),
  exam_status text not null default 'none'
    check (exam_status in ('none','upcoming','completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

- `class_schedule_id` is nullable → standalone classes. `on delete set null` keeps the occurrence (and its recorded attendance) when a template is deleted.
- **Idempotency index:** `create unique index idx_classes_schedule_occurrence on public.classes (class_schedule_id, date) where class_schedule_id is not null;` — `validate_class_schedule_entries()` already forbids two entries on the same weekday, so one occurrence per (schedule, date) is correct. The partial predicate keeps standalone rows from ever colliding.
- Other indexes, mirroring `lessons`: `(user_id)`, `(subject_id)`, `(user_id, date)`, and `(user_id, teacher) where teacher is not null` for the search facet (§5).
- `set_updated_at` trigger + the four per-user RLS policies, copied verbatim from the lessons migration.
- Add `alter table public.settings add column classes_materialized_at timestamptz;` here, mirroring `settings.notifications_generated_at` from `20260816120019_notifications_on_demand.sql`.

### `20260820150001_lessons_class_split.sql`

1. `alter table public.lessons add column class_id uuid references public.classes (id) on delete set null;` + index on it.
2. **Backfill** — one Class per existing Lesson, preserving every moved value, then link back. Use a temporary correlation column so the mapping is unambiguous:

```sql
alter table public.classes add column source_lesson_id uuid;

insert into public.classes (
  user_id, subject_id, date, start_time, duration_minutes,
  teacher, location, attendance_status, exam_status,
  created_at, updated_at, source_lesson_id
)
select user_id, subject_id, date, "time", duration_minutes,
       teacher, location, attendance_status, exam_status,
       created_at, updated_at, id
from public.lessons;

update public.lessons l set class_id = c.id
from public.classes c where c.source_lesson_id = l.id;

alter table public.classes drop column source_lesson_id;
```

3. **Rebuild `search_vector` before dropping columns.** `lessons.search_vector` is a _generated_ column over `title`(A), `teacher`(B), `location`(C) (`20260807120005_lessons.sql:24-28`), and `idx_lessons_search` is a GIN index on it. Postgres cannot alter a generation expression, so: `drop index idx_lessons_search;` → `alter table public.lessons drop column search_vector;` → re-add it as `title`-only → recreate the GIN index. Do this _before_ step 4.
4. `alter table public.lessons drop column attendance_status, drop column exam_status, drop column teacher, drop column location, drop column "time", drop column duration_minutes;`
5. Update the `comment on table public.lessons` to state the new Lesson/Class split.

### `20260820150002_gamification_attendance_from_classes.sql`

`public.sync_user_achievements()` computes `perfect-attendance` from `public.lessons.attendance_status` (`20260809120018_gamification_sync.sql:74-84`). Applied migrations are never edited — issue a fresh `create or replace function public.sync_user_achievements()` (copy the whole body, `security definer`, `set search_path = public`, and re-`grant execute ... to authenticated`) with only that block changed to read `public.classes`, and `count(*) filter (where attendance_status = 'attended')` counting against `attendance_status is not null` rather than all rows.

---

## 2. Types, validations, actions

**New `src/lib/types/class.ts`** — move `ATTENDANCE_STATUSES` / `AttendanceStatus` here from `lesson.ts`, and rename `LESSON_EXAM_STATUSES` / `LessonExamStatus` → `CLASS_EXAM_STATUSES` / `ClassExamStatus`. Define `Class` (with `attendanceStatus: AttendanceStatus | null`, `classScheduleId: UUID | null`), `ClassWithRelations` (subjectName/subjectColor/subjectIcon, as `ClassScheduleWithSubject` does), `CreateClassInput`, `UpdateClassInput`, `ClassFilters` (subjectId, attendanceStatus, examStatus, teacher, dateFrom, dateTo).

**Edit `src/lib/types/lesson.ts`** — delete the attendance/exam consts and types; drop `teacher`, `location`, `time`, `durationMinutes`, `attendanceStatus`, `examStatus` from `Lesson`, `CreateLessonInput`, `UpdateLessonInput`, `LessonFilters`; add `classId: UUID | null` to `Lesson` and optional `classId` to the inputs; drop `teacher` from `LessonFilters`.

**New `src/lib/validations/class.ts`** — same `(t) => z.object(...)` factory shape as `src/lib/validations/class-schedule.ts`. Trim `src/lib/validations/lesson.ts` to the surviving fields.

**New `src/actions/classes.ts` + `src/actions/classes.mutations.ts`** — mirror `lessons.ts`/`lessons.mutations.ts` idioms exactly (`mapClassRow`, `getAll(filters)`, `getById`, the `getAuthedUserId` helper, `MutationResult`, `revalidatePath("/", "layout")`). Mutations: `createClass`, `updateClass` (the sole writer of `attendance_status`/`exam_status`), `deleteClass`. Register `export * as Classes from "./classes"` in `src/actions/index.ts`.

**`src/actions/lessons.ts` / `.mutations.ts`** — drop the moved fields from `mapLessonRow`, the `attendanceStatus`/`teacher` query filters (`lessons.ts:149,152`), the `updateLesson` status patches (`lessons.mutations.ts:101,105`), the create insert, and `duplicateLesson`'s field copy (`lessons.mutations.ts:152`); carry `class_id` through duplicate.

**`src/lib/types/database.ts`** — regenerate with `npm run supabase:types` after the migrations apply (hand-edit only if the project id isn't configured locally).

---

## 3. Materialization from `class_schedules`

**New `src/actions/classes.generate.ts`**, modeled directly on `src/actions/notifications.generate.ts`:

- `ensureClassesForUser(supabase, userId)` — claims a run by compare-and-setting `settings.classes_materialized_at` against a refresh interval, exactly as `notifications.generate.ts` does with `notifications_generated_at` (that file's `REFRESH_INTERVAL_MS` + claim pattern is the template).
- Window: `today − 30 days` … `today + 30 days`, clamped per schedule to `starts_on`/`ends_on`, and only for `is_active` schedules.
- For each schedule, walk its `schedules` JSONB entries (typed `ClassScheduleEntry[]`) and enumerate window dates matching `dayOfWeek`. The weekday/time math already exists in `notifications.generate.ts` for `upcoming_class` — reuse it rather than writing a second copy, and use the helpers in `src/lib/notifications/dates.ts` (`localIsoDate`, `addDays`) for the user's local day.
- Insert with `.upsert(rows, { onConflict: "class_schedule_id,date", ignoreDuplicates: true })`. `attendance_status` is left `NULL`; `teacher`/`location`/`duration`/`start_time` are copied from the template so a later template edit doesn't silently rewrite history.

**Trigger points:** first call inside `dashboardActions.getOverview()`, `calendarActions.getMonth()`, and `classesActions.getAll()`. The compare-and-set guard makes repeat calls cheap.

**Template edited or deactivated** (`src/actions/class-schedules.mutations.ts` update + delete): delete _future, untouched_ occurrences for that schedule — `date > today and attendance_status is null and exam_status = 'none' and not exists (select 1 from lessons where lessons.class_id = classes.id)` — then let the next `ensureClassesForUser()` re-materialize. Past and recorded occurrences are never touched. This is the reason attendance is nullable.

---

## 4. UI modules

**New `modules/classes/`** following `modules/lessons/` structure exactly (`list/{index.ts,ssr,csr}`, `detail/{index.ts,ssr,csr}`, `components/`, barrel `index.ts`); register `export * as Classes from "./classes"` in `modules/index.ts`. Components: `ClassFormDialog`, `ClassActionsMenu`, `DeleteClassDialog`, and `ClassStatusControls`.

**Split `modules/lessons/components/LessonStatusControls.tsx`** — it is a field-driven array of five `<Select>`s. Remove the `attendance` and `exam` entries (leaving study/review/homework) and lift those two into the new `ClassStatusControls`, which calls `updateClass` instead of `updateLesson`. `ClassStatusControls` must render the attendance select with an unset/"not recorded" state for `null`.

**New `src/components/ui-system/class-card.tsx`** — carries the date/time/duration/teacher/location display and the attendance + exam `StatusBadge`s. `src/components/ui-system/status-badge.tsx` keeps `ATTENDANCE_STATUS_META` and `EXAM_STATUS_META` as-is; only the imported types' origin changes (now `@/lib/types/class`), plus a `null` guard for unrecorded attendance.

**`src/components/ui-system/lesson-card.tsx`** — remove the exam badge (`:89,94-95`) and the time/teacher/location block (`:74-85`); keep the study and homework badges. If the lesson has a `classId`, optionally surface a link to the class.

**`modules/lessons/`** — `LessonFormDialog.tsx:100-104` drops the teacher/location/time/duration fields and gains an optional Class picker; `LessonsListView.tsx:77-78` drops teacher/location from its client-side text filter and the attendance filter control; `LessonsDetailView.tsx:168-171` drops the teacher row and renders a link to the linked Class instead.

**Routes** — `src/app/[locale]/(app)/classes/list/page.tsx` and `classes/detail/[classId]/page.tsx`, mirroring the existing lessons routes and their `Actions.*` SSR wiring.

**Nav** (`src/lib/constants/navigation.ts:34`) — add `{ href: "/classes/list", key: "classes", icon: CalendarClock }` and repoint the existing `/class-schedules/list` entry to a new `schedule` key.

---

## 5. Rewiring the consumers

Every site below reads a column that is moving. All were confirmed by grep.

| File                                                                                      | Change                                                                                                                                                                                                                                                                                                                                                                                                              |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/actions/dashboard.ts:74-139`                                                         | `fetchLessonsWithRelations` → `fetchClassesWithRelations`, querying `classes` (`date >= today`, order by `date`,`start_time`). Keep the existing in-memory split (`:133-138`) into today (`date === todayIso`) / upcoming (`slice(0,5)`). Drop the attendance/exam mapping at `:45,49`. Call `ensureClassesForUser()` first.                                                                                        |
| `src/lib/types/dashboard.ts:23`                                                           | `todayLessons`/`upcomingLessons` → `todayClasses`/`upcomingClasses`, typed `ClassWithRelations[]`.                                                                                                                                                                                                                                                                                                                  |
| `modules/dashboard/overview/csr/DashboardOverviewView.tsx:55-66` + `lesson-list-card.tsx` | Rename to `class-list-card.tsx` rendering `ClassCard`; retitle to the classes i18n keys.                                                                                                                                                                                                                                                                                                                            |
| `src/actions/statistics.ts:38,64,130,308`                                                 | Attendance rate + `buildAttendanceBreakdown()` read `classes`, counting only `attendance_status is not null`. **Also `:323`** — `minutesBySubject` sums `lesson.duration_minutes`; that column is moving, so this chart must sum `classes.duration_minutes`. Split `fetchRawData`'s single `lessons` query into a lessons query (date/subject/study_status) and a classes query (date/subject/duration/attendance). |
| `src/actions/subjects.ts:48,67,98`                                                        | Per-subject `attendanceRate` reads `classes` instead of `lessons`. Type `src/lib/types/subject.ts:30` and `modules/subjects/detail/csr/SubjectsDetailView.tsx:63-65` keep their shape.                                                                                                                                                                                                                              |
| `src/lib/search/query.ts:45,79,94`                                                        | The lessons `select("id, title, teacher, location")` drops teacher/location and its result `subtitle` becomes `null`; the teacher facet (`:57-62`, an `ilike` — no tsvector needed) queries `classes.teacher`; the teacher result's `path` points at the classes list rather than `LESSONS_LIST_PATH`. Consider adding classes as a search kind.                                                                    |
| `src/actions/calendar.ts`                                                                 | `getMonth` currently buckets lessons only. Add classes per day (`CalendarDay` in `src/lib/types/calendar.ts` gains `classes: ClassWithRelations[]`), reusing `classesActions.getAll({dateFrom,dateTo})` the same way it reuses `lessonsActions.getAll`. `rescheduleLesson` only updates `date`, so it still works unchanged; `CalendarMonthView.tsx` renders both lists.                                            |
| `src/actions/notifications.generate.ts`                                                   | Generate `upcoming_class` from materialized `classes` rows instead of weekday math over the JSONB (simpler, and the rows now exist). `upcoming_lesson` stays date-based but loses `time: lesson.time` (`:246`) — drop the time argument from `upcomingLessonCopy` in `src/lib/notifications/copy.ts`. `UPCOMING_CLASS_LEAD_MINUTES` and the notification types/prefs/icons are otherwise unchanged.                 |

---

## 6. i18n — `messages/en.json` **and** `messages/ar.json` (RTL; keep in lockstep)

- New `classes.*` namespace (list/detail/form/empty states/actions), modeled on the existing `classSchedules.*` and `lessons.*` blocks.
- Move `lessons.status.attendance.*` and `lessons.status.exam.*` → `classes.status.*`; add an "not recorded" label for null attendance.
- Remove the lesson form/detail keys for teacher, location, time, duration.
- Nav: `classes` label now points at occurrences; add a `schedule` key for `/class-schedules/list`.
- Dashboard: retitle `todayLessons.title` / `upcomingLessons.title` → `todayClasses` / `upcomingClasses`.

---

## 7. Execution order

1. Write the three migrations; apply to a local/branch Supabase and confirm the backfill preserved every lesson's attendance/exam/teacher/location/time.
2. `npm run supabase:types`.
3. Types + validations (`class.ts`, `lesson.ts`, both validation files).
4. `src/actions/classes.ts`, `classes.mutations.ts`, `classes.generate.ts`; register in `src/actions/index.ts`; trim the lessons actions.
5. Rewire consumers (§5) — do this before the UI so `npm run typecheck` converges.
6. UI: `class-card`, `ClassStatusControls`, `modules/classes/`, routes, nav, lesson-side removals, dashboard card rename.
7. i18n for both locales.
8. `npm run typecheck && npm run lint`.

## 8. Verification

- `npm run typecheck` and `npm run lint` clean (there is no test script in `package.json`).
- `npm run dev`, then drive the app in the browser preview:
  - **Dashboard** shows "Today's classes" / "Upcoming classes" populated from `classes`, not lessons.
  - Create a `class_schedules` template with a recurring weekday, reload the dashboard, and confirm occurrences were materialized; reload again and confirm **no duplicates** (the unique index + claim guard hold).
  - Open a Class detail, set attendance to `absent` and exam to `upcoming`, confirm persistence and that the badges render in both LTR and RTL (`/ar`).
  - Open a Lesson detail: only study/review/homework controls remain; no teacher/location/time; the optional Class link works.
  - Deactivate the schedule and confirm future _untouched_ occurrences disappear while the `absent`-marked one survives.
  - **Statistics** attendance-rate card + pie chart, and **Subject detail** attendance rate, all still render off `classes`.
  - **Calendar** month shows both classes and lessons; drag-reschedule of a lesson still works.
  - **Search** for a teacher name returns the teacher facet and routes to the classes list.
- Check `read_console_messages` / `preview_logs` for errors on each page above.

## Out of scope (flag as follow-ups)

- `exams.lesson_id` is `NOT NULL` and still ties scored exams to Lessons, while `exam_status` now lives on Class. The pre-existing, unreconciled duplication between that flag and the `exams` table is deliberately untouched.
- `homework`, `flashcards`, `lesson_notes`, `attachments`, and `study_sessions` keep their `lesson_id` links unchanged.
