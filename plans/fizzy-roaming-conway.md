# Final polish: global search, filters, gamification (XP/levels/streaks/goals/achievements)

## Context

Three feature areas are currently stubbed placeholders in this Next.js/Supabase study-tracker: global search (`src/actions/search.ts` returns `[]`, no UI, no nav entry point), gamification (XP/level are hardcoded `PLACEHOLDER_XP` in `src/actions/dashboard.ts`; achievements/goals actions are empty stubs; both have `FeaturePlaceholder` views), and filters (already fully built for lessons/homework/exams — confirmed complete, no work needed there). This phase replaces the stubs with real, working features, following the repo's mandatory `page → SSR → CSR` architecture and its established pattern of *deriving* gamification stats on read (streaks already work this way) rather than persisting counters.

Streaks are already real (`computeStreaks()` in `dashboard.ts`, driven by `study_sessions`) — no changes needed there beyond reuse.

## 1. XP / Level (derived on-the-fly, no new persisted columns)

New `src/lib/constants/gamification.ts`:
```
XP_PER_COMPLETED_LESSON = 10   // lessons.study_status in ('completed','reviewed')
XP_PER_STUDY_HOUR = 5          // floor(totalMinutes/60) * 5
XP_PER_COMPLETED_HOMEWORK = 8  // homework.completed = true
XP_PER_SCORED_EXAM = 15        // exams.score is not null
XP_BONUS_EXAM_ACE = 10         // additional, per exam with percentage >= 90
XP_PER_UNLOCKED_ACHIEVEMENT = 50
XP_LEVEL_BASE = 50
ACHIEVEMENT_ICONS: Record<string, LucideIcon>  // "sparkles" | "flame" | "clock" | "check-circle" | "award" -> icon component, mirrors SUBJECT_ICON_COMPONENTS in src/lib/constants/subjects.ts
```
Level curve: `level = floor(sqrt(xp / XP_LEVEL_BASE)) + 1`; `xpToNextLevel = level^2 * XP_LEVEL_BASE - xp`.

New pure module `src/lib/gamification/xp.ts` (no `"use server"`/`"server-only"` — pure math):
- `computeXp(counts): number`
- `computeLevel(xp): { level, xpToNextLevel }`

`src/actions/dashboard.ts`: delete `PLACEHOLDER_XP`. `fetchProgress()` gains a `Promise.all` of aggregate counts (completed lessons, `sum(study_sessions.duration_minutes)`, completed homework, scored exams, ace exams, unlocked achievements — the last via the same `user_achievements` read `getAchievements()` uses, after calling the sync RPC below) and feeds them into `computeXp`/`computeLevel`. `progress-card.tsx` already renders real `level`/`xp`/`xpToNextLevel` — **no change needed there**, it just starts receiving real data.

## 2. Achievements: new SECURITY DEFINER sync function + real action

New migration `supabase/migrations/20260809120018_gamification_sync.sql` — `sync_user_achievements()`, no params, reads `auth.uid()` internally (same trust boundary as every RLS policy in this schema), `SECURITY DEFINER`, `grant execute ... to authenticated`. This is the sanctioned write path `user_achievements` currently lacks (its migration explicitly defers writes to "a SECURITY DEFINER function ... built out alongside the relevant CRUD phases").

Computes and upserts progress/unlock for all six catalog keys from real data:
- `first-lesson`: any lesson with `study_status in ('completed','reviewed')`.
- `streak-7` / `streak-30`: longest run of consecutive `study_sessions` days, via a `date_trunc('day', started_at)` distinct-dates CTE grouped by the `day - row_number()` consecutive-run trick — mirrors `computeStreaks()` in `dashboard.ts` since there's no persisted streak column.
- `hundred-hours`: `sum(study_sessions.duration_minutes) >= 6000`.
- `exam-ace`: any `exams.percentage >= 90` (real generated column, confirmed in `20260807120011_exams.sql`).
- `perfect-attendance`: evaluated over the **most recently fully-completed calendar month** (`[date_trunc('month', current_date) - interval '1 month', date_trunc('month', current_date))`), not the in-progress month — checking the in-progress month against "today" would only ever be correct on literally the last calendar day, so this must look one month back to be checkable on every run.
- Progress/unlock is **monotonic**: `progress = greatest(existing, new)`, `unlocked_at = coalesce(existing, new)` — never regresses once earned, since achievements are historical milestones (e.g. a broken streak shouldn't un-earn `streak-7`).
- Upsert via `insert ... on conflict (user_id, achievement_id) do update ...` against a `values (...)` list joined to `achievements` by `key`.

`src/actions/gamification.ts` `getAchievements()`: get authed user, `await supabase.rpc("sync_user_achievements")` (swallow/log a benign RPC error rather than failing the page — same philosophy as `dashboard.ts`'s per-widget resilience), then two queries (`achievements` catalog + this user's `user_achievements`) joined in memory (consistent with how `dashboard.ts`/`subjects.ts` do multi-table joins elsewhere in this codebase rather than Supabase embedded joins), mapped to `Achievement[]`.

`modules/gamification/achievements/csr/GamificationAchievementsView.tsx`: replace `FeaturePlaceholder` with a responsive card grid — icon (via `ACHIEVEMENT_ICONS[achievement.icon]`), title/description **sourced from i18n by `achievement.key`**, not the DB row (keeps bilingual parity without adding `title_ar`/`description_ar` columns — `key` is already the stable identifier designed for this), "Unlocked {date}" badge when unlocked, else a progress bar. Locked cards visually muted vs unlocked.

## 3. Goals: real CRUD + real progress

New `src/lib/validations/goal.ts`: `createGoalSchema(t)` mirroring the translator-function convention in `src/lib/validations/subject.ts` (`period: z.enum(GOAL_PERIODS)`, `targetMinutes: z.coerce.number().int().min(1)`).

`src/lib/types/goal.ts`: add `CreateGoalInput { period: GoalPeriod; targetMinutes: number }` (mirrors `CreateSubjectInput`/`UpdateSubjectInput` shape in `src/lib/types/subject.ts`).

New `src/actions/gamification.mutations.ts` (`"use server"`, modeled on `src/actions/subjects.mutations.ts`):
- `setCurrentGoal(input: CreateGoalInput): Promise<MutationResult>` — computes `period_start` server-side (never trust a client date) via `date-fns` `startOfWeek(new Date(), { weekStartsOn: 1 })` (matches the Monday-start convention already used in `src/actions/statistics.ts`) or `startOfMonth(new Date())`, formatted `yyyy-MM-dd`; upserts via `.upsert(..., { onConflict: "user_id,period,period_start" })` against the table's existing unique constraint — this is the "set my goal for the current period" flow.
- `updateGoal(id, input: Partial<CreateGoalInput>): Promise<MutationResult>` and `deleteGoal(id): Promise<MutationResult>` — scoped by `id` + `user_id`, for editing/removing any goal (including past ones), same shape as `subjects.mutations.ts`.
- All three end with `revalidatePath("/", "layout")`.

`src/actions/gamification.ts` `getGoals()`: fetch all goals for the user (`order by period_start desc`), then one `study_sessions` query spanning from the earliest goal's `period_start` to today, aggregate `duration_minutes` per goal's `[period_start, period_end)` window in memory, and **overwrite** each goal's `achievedMinutes` with the computed sum (the stored `achieved_minutes` column is never trusted/written — nothing updates it today, consistent with the derive-don't-persist pattern).

`modules/gamification/goals/csr/GamificationGoalsView.tsx`: replace `FeaturePlaceholder` — current-period card (progress bar/ring, target vs. computed achieved minutes, "no goal set" empty state + "Set a goal" button), a simple list of past goals below, edit/delete affordances per past goal.

New `modules/gamification/components/GoalFormDialog.tsx`: react-hook-form + zod + `useMutation`, modeled 1:1 on `modules/subjects/components/SubjectFormDialog.tsx` (same reset-on-open trick, same `mutation.onSuccess`/`formError` shape). Fields: period select (weekly/monthly), target-minutes number input.

New `modules/gamification/components/DeleteGoalDialog.tsx` using the existing `ConfirmDialog` pattern from `modules/homework/components/DeleteHomeworkDialog.tsx`.

## 4. Global search

**Backend**: `subjects`/`tags` have no `search_vector` (small flat tables → plain `ilike` is fine); `lessons` and `lesson_notes` already have generated weighted `tsvector` `search_vector` columns with GIN indexes (`20260807120005_lessons.sql`, `20260807120007_lesson_notes.sql`) — use real Postgres FTS there via `.textSearch("search_vector", query, { type: "websearch" })`.

New shared helper `src/lib/search/query.ts` (`"server-only"`, exports `runSearchQuery(supabase, userId, query): Promise<SearchResultItem[]>`) — one implementation reused by both the SSR-only action and the client-invokable one, same pattern as `mapNotificationRow` in `src/lib/notifications/map.ts` being shared across `notifications.ts`/`notifications.mutations.ts`. Runs in parallel: subjects `ilike name` → path `/subjects/detail/{id}`; lessons `textSearch` → path `/lessons/detail/{id}`; lesson_notes `textSearch` → path `/lessons/detail/{lessonId}` (subtitle = parent lesson title); distinct `lessons.teacher` via `ilike` + JS de-dup → path `/lessons/list`; tags `ilike name` → path `/lessons/list`. Empty/whitespace query short-circuits to `[]`. Caps total results (~30 for the full page, ~8 for the palette — pass a `limit` param).

`src/actions/search.ts` (`"server-only"`, keeps existing `searchActions.search(query)` signature used by `SearchResults` SSR component): thin wrapper calling `runSearchQuery`.

New `src/actions/search.mutations.ts` (`"use server"`): `liveSearch(query): Promise<ActionResult<SearchResultItem[]>>`, same helper, smaller limit — this is the CSR-invokable path, same precedent as `getRecentNotifications` in `notifications.mutations.ts`.

**UI**:
- `modules/search/results/csr/SearchResultsView.tsx`: replace `FeaturePlaceholder` — group `data` by `kind`, icon per kind (subject→BookOpen, lesson→NotebookText, teacher→GraduationCap, note→FileText, tag→Tag), each a `Link` (from `@/i18n/navigation`) to `item.path`; `EmptyState` when no query or no results.
- New `src/components/ui-system/search-result-item.tsx`: one shared row renderer (icon + title + subtitle), reused by both the results page and the command palette.
- New `src/components/shared/global-search.tsx` (`"use client"`): Cmd/Ctrl+K command palette using the existing `CommandDialog` from `src/components/ui/command.tsx` (already Dialog-wrapped, no primitive work needed). Local `open` state + `keydown` listener; `CommandInput` bound via the existing `useDebouncedValue` hook (same one `search-input.tsx` uses, ~250ms); TanStack Query (`useQuery`, `queryKey: ["search","live",debouncedQuery]`, `enabled` on non-empty query) calling `liveSearch`. Results grouped into `CommandGroup`s by kind; selecting an item navigates via `router.push(item.path)` and closes; a trailing "View all results for '{query}'" item routes to `/search/results?q=...` — this is how the palette (instant-answer) composes with the existing full results page (exhaustive). RTL: `dir={isArabic ? "rtl" : "ltr"}` on the dialog content, same pattern as `filter-sidebar.tsx`'s `isRtl` handling.
- `src/components/shared/nav-bar.tsx`: add a search trigger (icon-only on mobile, icon+label+kbd-hint on desktop) in the existing icon cluster before `NotificationBell`, rendering `<GlobalSearch />` which owns its own state — no new state plumbing in `NavBar` itself.

## 5. Filters — no work needed

Confirmed already fully implemented for lessons/homework/exams via `FilterSidebar` + `SearchInput` + client-side `useMemo` filtering (canonical reference: `modules/homework/list/csr/HomeworkListView.tsx`). `subjects/list` intentionally has none (small flat list). `study-sessions/history` is a separate still-unbuilt placeholder, out of scope for this task (not mentioned in the request, belongs to a different undone phase — leaving untouched).

## 6. i18n

New/updated `messages/en.json` **and** `messages/ar.json` (must stay key-mirrored — currently 559/559 keys match) namespaces:
- `search`: `palette.{placeholder,empty,prompt,viewAll,groups.subject/lesson/teacher/note/tag}`, `results.{title,subtitle,emptyTitle,emptyDescription,promptTitle,promptDescription}`, `trigger.label`.
- `gamification.achievements`: `title,subtitle,unlockedOn,locked,progressLabel,emptyTitle,emptyDescription`, plus `items.<camelCaseKey>.{title,description}` for each of the six achievement keys (`firstLesson`, `streak7`, `streak30`, `hundredHours`, `perfectAttendance`, `examAce`) — sourced by `achievement.key`, not the DB row, for bilingual parity.
- `gamification.goals`: `title,subtitle,currentPeriod,weekly,monthly,noGoalTitle,noGoalDescription,setGoal,achievedOfTarget,pastGoals,noPastGoals`, `form.{createTitle,editTitle,createDescription,editDescription,periodLabel,targetMinutesLabel,targetMinutesPlaceholder,cancel,submitting,submitCreate,submitEdit,errors.targetRequired}`, `delete.{title,description,confirm,cancel,genericError}`.
- `dashboard.progress` already has `title`/`level`/`xpToNext` — no changes needed.

## Sequencing

1. Migration `20260809120018_gamification_sync.sql` (apply via the project's Supabase migration command).
2. `src/lib/constants/gamification.ts`, `src/lib/gamification/xp.ts` (pure, standalone).
3. `src/lib/types/goal.ts` additions, `src/lib/validations/goal.ts`.
4. `src/actions/gamification.mutations.ts` → `src/actions/gamification.ts` (getAchievements + getGoals) → wire `dashboard.ts`'s `fetchProgress` to real XP.
5. `src/lib/search/query.ts` → `src/actions/search.ts` → `src/actions/search.mutations.ts`.
6. CSR/UI: achievements view, goals view + `GoalFormDialog`/`DeleteGoalDialog`, search results view + `search-result-item.tsx`.
7. `src/components/shared/global-search.tsx` → wire into `nav-bar.tsx`.
8. i18n: add all new keys to both `en.json` and `ar.json` together, per key, not en-then-ar.
9. Sanity pass on `src/actions/index.ts` (no changes expected — `Search`/`Gamification` already registered).

## Verification

- `npm run lint` / `npm run typecheck` (or the repo's equivalent scripts in `package.json`) after the actions layer and again after the UI layer.
- Manual browser verification via the dev server (`preview_start` against the Next.js dev config):
  - Dashboard progress card shows non-placeholder, changing level/XP.
  - `/gamification/achievements`: six cards render, locked vs unlocked visually distinct, progress bars reflect real data, unlocked state persists across reloads (doesn't reset).
  - `/gamification/goals`: create a weekly goal, confirm computed achieved-minutes matches actual `study_sessions` for the current week; edit/delete a goal; past goals list correctly.
  - Search: Cmd/Ctrl+K from any page, grouped results with correct navigation targets, empty/no-results states, "View all results" footer link to `/search/results?q=...`; re-check in `ar` locale for RTL correctness (dialog side, alignment).
  - Nav-bar search trigger reachable on desktop and mobile.
