# Homework & Exams + Calendar (Phases 11 & 12)

## Context

The repo is mid-way through a phased build-out of a student study-tracking app (`study-line`), following a strict mandatory `page.tsx → SSR → CSR` architecture (`node_modules/next/dist/docs/`-flavored Next.js + the project's `nextjs-architecture` skill). Phases 9/10 (Lessons CRUD, Notes, Attachments) just landed. The `modules/homework`, `modules/exams`, and `modules/calendar` directories, their `src/actions/*.ts` files, and DB migrations (`homework`, `exams` tables) already exist as scaffolds — the CSR views currently render `FeaturePlaceholder` and the actions are stubs literally marked `Not implemented until Phase 11/12`. The user's request is to build out these two remaining phases:

- **Homework & Exams**: deadlines, completion tracking, score → auto percentage.
- **Calendar**: monthly view, color-coded by subject, click-to-view-day, drag-and-drop reschedule.

This plan implements both against the existing schema/types/scaffolds, reusing the exact patterns already established by the Lessons feature (`modules/lessons/**`, `src/actions/lessons.ts`, `src/actions/lessons.mutations.ts`).

## Key existing pieces to reuse (do not duplicate)

- **DB tables** already migrated: `public.homework` (title, deadline, completed, lesson_id, subject_id) and `public.exams` (title, date, score, total_score, generated `percentage` column) — [20260807120010_homework.sql](supabase/migrations/20260807120010_homework.sql), [20260807120011_exams.sql](supabase/migrations/20260807120011_exams.sql). RLS already in place.
- **Types**: [src/lib/types/homework.ts](src/lib/types/homework.ts), [src/lib/types/exam.ts](src/lib/types/exam.ts) (incl. `calculateExamPercentage`), [src/lib/types/calendar.ts](src/lib/types/calendar.ts) — need small additions only (Update\*Input types, filters).
- **`src/lib/types/database.ts` is currently empty** (checked in as a placeholder, regenerated via `npm run supabase:types`). Confirmed the Supabase CLI works against the linked project via `npx supabase gen types typescript --project-id azayjuzmfuszdufunrru --schema public` and correctly emits `homework`/`exams` table types. **First implementation step: regenerate this file** so the new mutation/query files can use `Database["public"]["Tables"]["homework"|"exams"]["Row"|"Insert"|"Update"]` like `lessons.ts` does.
- **Architecture pattern** to mirror exactly: [src/actions/lessons.ts](src/actions/lessons.ts) (SSR queries + relation joins), [src/actions/lessons.mutations.ts](src/actions/lessons.mutations.ts) (`"use server"` client-invokable mutations, re-exported into the SSR action object), [modules/lessons/list/\*\*](modules/lessons/list), [modules/lessons/components/LessonFormDialog.tsx](modules/lessons/components/LessonFormDialog.tsx), [DeleteLessonDialog.tsx](modules/lessons/components/DeleteLessonDialog.tsx), [LessonActionsMenu.tsx](modules/lessons/components/LessonActionsMenu.tsx).
- **UI-system components** to reuse as-is: `EmptyState`, `SearchInput`, `FilterSidebar`/`EMPTY_FILTER_VALUE`, `ConfirmDialog`, `StatusBadge`-style meta pattern, `Ring` (perfect fit for exam percentage), and `LessonCard` (reused directly inside the calendar's day-detail dialog).
- **Query-string month navigation** pattern: mirrors [src/app/[locale]/search/results/page.tsx](src/app/%5Blocale%5D/search/results/page.tsx) / [modules/search/results/ssr/SearchResults.tsx](modules/search/results/ssr/SearchResults.tsx) (`searchParams: Promise<{...}>` threaded through page → SSR).
- No toast library in the repo — errors surface as inline text (`formError` state), same convention as `LessonFormDialog`.
- `LessonFilters` already supports `dateFrom`/`dateTo`, so Calendar's month query is built by calling `Actions.Lessons.getAll({ dateFrom, dateTo })` and bucketing by date — no new join logic needed.

## Part A — Homework & Exams

### 1. Types (extend, don't replace)

- `src/lib/types/homework.ts`: add `UpdateHomeworkInput = Partial<CreateHomeworkInput> & { completed?: boolean }`.
- `src/lib/types/exam.ts`: add `UpdateExamInput = Partial<CreateExamInput>`.

### 2. Validations (new files, mirror `src/lib/validations/lesson.ts`)

- `src/lib/validations/homework.ts`: `createHomeworkSchema(t)` — `lessonId: z.uuid()`, `title` (1-160), `deadline: z.string().min(1)`.
- `src/lib/validations/exam.ts`: `createExamSchema(t)` — `lessonId`, `title`, `date`, `totalScore: z.number().positive()`, `score: z.number().min(0).optional()`, refined so `score <= totalScore` when present.

### 3. Mutations (new `"use server"` files, mirror `lessons.mutations.ts`)

- `src/actions/homework.mutations.ts`: `createHomework`, `updateHomework`, `toggleHomeworkCompleted`, `deleteHomework`. On create, **look up the lesson server-side** (`lessons.select("subject_id").eq("id", input.lessonId).eq("user_id", userId)`) to derive `subject_id` — never trust a client-supplied subject id.
- `src/actions/exams.mutations.ts`: `createExam`, `updateExam`, `updateExamScore`, `deleteExam`. Same server-side subject-id derivation on create.
- Both call `revalidatePath("/", "layout")` on success, same as lessons.

### 4. SSR-facing action objects (replace the stubs)

- `src/actions/homework.ts`: real `getAll()` querying `homework` joined with `subjects` (name/color) and `lessons` (title) — same bulk-fetch-then-map style as `attachRelations` in `lessons.ts` but lighter (two lookups, no N+1). Re-export `create/update/toggleCompleted/remove` from the mutations file.
- `src/actions/exams.ts`: same shape; `percentage` comes straight off the DB's generated column (already computed server-side — no manual calc needed for storage; `calculateExamPercentage` stays available for any client-side optimistic display).

### 5. UI-system cards (new, mirror `lesson-card.tsx`)

- `src/components/ui-system/homework-card.tsx`: checkbox (toggles `completed` via `toggleHomeworkCompleted` + `useTransition`), subject color dot + name, title, deadline formatted with `date-fns`, an "Overdue" indicator when `!completed && deadline < today`, actions menu (edit/delete).
- `src/components/ui-system/exam-card.tsx`: subject dot + name, title, date, and a `Ring` showing `percentage` when scored; when `score === null`, an inline "Record score" mini-form (number input + save button) calling `updateExamScore` directly — this is the concrete "score → auto percentage" UX. Actions menu (edit/delete) still opens the full edit dialog for title/date/totalScore changes.

### 6. Module components (mirror `modules/lessons/components/*`)

- `modules/homework/components/HomeworkFormDialog.tsx` (lesson picker — flat `Select` of non-archived lessons labeled "Subject — Lesson", title, deadline date input), `DeleteHomeworkDialog.tsx` (wraps `ConfirmDialog`).
- `modules/exams/components/ExamFormDialog.tsx` (lesson picker, title, date, totalScore, optional score), `DeleteExamDialog.tsx`.

### 7. List views (mirror `LessonsList`/`LessonsListView`)

- `modules/homework/list/ssr/HomeworkList.tsx`: fetch `Actions.Homework.getAll()`, `Actions.Lessons.getAll()` (for the picker), `Actions.Subjects.getAll()` (for the filter sidebar).
- `modules/homework/list/csr/HomeworkListView.tsx`: search (title), `FilterSidebar` (subject + completion), grid of `HomeworkCard`s split into a "Pending" section (sorted by deadline ascending) and a collapsible "Completed" section — same collapsible pattern as Lessons' archived section. `EmptyState` when zero homework or zero lessons exist (disable "New homework" button with a hint if there are no lessons yet, same as Lessons does for subjects).
- Same shape for `modules/exams/list/**`, splitting "Upcoming" (date ≥ today) vs collapsible "Past" exams, sorted by date.

### 8. i18n

Add `homework` and `exams` namespaces to `messages/en.json` and `messages/ar.json`, structured exactly like the existing `lessons` namespace (`list`, `card`, `form.errors`, `delete`) — both files currently have `null` for these keys.

## Part B — Calendar

### 1. SSR / page wiring (query-string month navigation)

- `src/app/[locale]/calendar/month/page.tsx`: accept `searchParams: Promise<{ year?: string; month?: string }>`, pass through — same shape as `search/results/page.tsx`.
- `modules/calendar/month/ssr/CalendarMonth.tsx`: await `searchParams`, default to the current year/month, call `Actions.Calendar.getMonth(year, month)` and `Actions.Subjects.getAll()` (for the legend), pass both down.

### 2. Action (`src/actions/calendar.ts`)

- `getMonth(year, month)`: compute the month's ISO start/end (`date-fns` `startOfMonth`/`endOfMonth`/`format`), call `lessonsActions.getAll({ dateFrom, dateTo })` (imported from `./lessons` — reuses the existing join/relation logic instead of duplicating it), then bucket results by `date` into `CalendarDay[]` via `eachDayOfInterval`. Returns the existing `CalendarMonthData` shape unchanged.
- `src/actions/calendar.mutations.ts` (new, `"use server"`): `rescheduleLesson(lessonId, newDate)` — auth-checked `supabase.from("lessons").update({ date: newDate }).eq("id", lessonId).eq("user_id", userId)`, `revalidatePath("/", "layout")`. Re-exported as `Actions.Calendar.rescheduleLesson`.

### 3. CSR (`modules/calendar/month/csr/CalendarMonthView.tsx`)

- Header: month/year title, prev/next buttons that navigate via `router.push` (from `@/i18n/navigation`) to `?year=&month=`, re-triggering the SSR fetch (no client-side data fetching, per architecture rules).
- Grid: 7-column month grid, padded with empty leading/trailing cells computed client-side from the first day's weekday offset (no extra data needed — `CalendarMonthData` stays as-is). Each real day cell renders up to ~3 lesson "pills" (`subjectColor` dot + truncated title) with a "+N more" overflow indicator, and is highlighted if it's today.
- **Color-coding**: pills use `lesson.subjectColor`/`subjectName` straight off `LessonWithRelations` (already present in `CalendarDay.lessons`); a small legend row below the header lists each subject's color + name from the `Subjects.getAll()` data passed down.
- **Click-to-view-day**: clicking a day cell (not a pill drag) opens a `Dialog` listing that day's lessons using the existing `LessonCard` component (linking to `/lessons/detail/[id]`) — pure client-side, data's already loaded, no extra fetch.
- **Drag-and-drop reschedule**: native HTML5 DnD (no new dependency — `date-fns` is already the only date lib in use, and no drag library exists in the repo). Pills get `draggable` + `onDragStart` (stash lesson id), day cells get `onDragOver`/`onDrop` (visual highlight while dragging over, call `rescheduleLesson` on drop, then `router.refresh()`). Drop errors surface as a small inline text near the header, matching the no-toast convention used elsewhere.

### 4. i18n

Add a `calendar` namespace (`month.title`, nav labels, day-of-week labels respecting locale, dialog strings, drag-error string) to both message files.

## Verification

1. `npm run supabase:types` to regenerate `src/lib/types/database.ts` (currently empty) so the new files type-check against real `homework`/`exams` columns.
2. `npm run typecheck` and `npm run lint` after implementation.
3. Launch the dev server via the Browser pane preview tools and manually walk:
   - Homework: create (from a lesson), toggle complete, edit, delete, deadline sort/overdue styling, filter/search.
   - Exams: create without a score, confirm "not graded" state, record a score inline and confirm the `Ring` percentage updates, edit via the full dialog, delete.
   - Calendar: navigate months via query params, confirm subject color-coding, click a day to open the lesson list dialog, drag a lesson pill to a different day and confirm the date updates (and the lesson also reflects the new date in the Lessons list).
4. Check both `en` and `ar` locales render the new pages (RTL layout, translated strings) since the app is bilingual throughout.
