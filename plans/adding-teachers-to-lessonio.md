# Adding Teachers to Lessonio

## Context

Lessonio today is a **single-user student app**. There is no role system anywhere: `public.profiles` has only `id, full_name, avatar_url, timezone`, there are zero Postgres enums, and every one of the ~19 tables carries the identical four RLS policies `user_id = (select auth.uid())`. The word "teacher" exists solely as a free-text column on `public.classes` — the student's note about who teaches them. `NAV_ITEMS` renders unconditionally; `src/lib/supabase/middleware.ts` gates only on "is there a session?".

We want a real teacher role. Confirmed scope:

- A teacher **runs classes** and **assigns work** to them.
- A teacher **grades submitted work**.
- Students join a class with a short **join code** — **optionally**. Having a teacher is never required to use Lessonio.
- Role is **chosen at signup** and immutable afterwards.
- One plan, **built in phases** — Phase 1 lands the foundation without changing anything for existing users.

The hard part is not the UI. It is that a teacher reading a student's submission is the first cross-user read in the entire codebase, and the existing RLS model has no vocabulary for it.

---

## Core constraint: teachers are optional for students

**`role = 'student'` never implies the student is enrolled with a teacher.** Lessonio supports two student modes, and both are first-class:

```text
User
├── role = "student"
│   ├── personal Lessonio data          (always)
│   └── class_enrollments[]             (optional, many-to-many)
│         ├── zero    → independent student
│         └── one+    → teacher-connected student
│
└── role = "teacher"
      └── teacher_classes[]
```

Teacher functionality is **additive**. It never replaces, restructures, gates, or degrades the existing student experience.

Binding rules for every phase below:

- **No third role.** `type AppRole = "student" | "teacher"` — nothing else. The teacher relationship is represented *exclusively* by rows in `class_enrollments`. **Never infer teacher connectivity from `profiles.role`.**
- **A student with zero enrollments is a normal, valid, permanent state** — not an exception, not an empty-account state to be nudged out of.
- **No existing student route may require an enrollment.** Lessons, subjects, personal homework, exams, goals, study sessions, achievements, notifications, settings, search and the dashboard all keep working untouched for a student who never joins anything.
- **No redirect, guard, onboarding step, interstitial or blocking empty state may push a student toward joining a class.** Joining is a deliberate, optional action taken later at `/classroom/classes`.
- `getMyClasses() → []` and `getAssignedToMe() → []` are **successful results**, never errors. Actions return `{ data: [], error: null }`.
- **No existing student-owned RLS policy is modified.** A student with no enrollment simply matches zero teacher-owned rows, while their own `user_id = (select auth.uid())` policies keep working exactly as they do today.

Reviewer's check on every diff: if a change would break for a student who has never joined a class, it is wrong.

---

## Decisions taken (and why)

**1. Teacher classes are new tables, not an extension of `public.classes`.**
`classes.subject_id` is `NOT NULL` → `subjects`, which is student-owned; `meetings` JSONB is `NOT NULL` and validated by `validate_class_meetings`; `ensureClassOccurrencesForUser()` in [class-occurrences.generate.ts](src/actions/class-occurrences.generate.ts) materializes occurrences for every `classes` row of a user; and `sync_user_achievements()` reads those occurrences. A teacher row in that table poisons all four. `public.classes` is untouched by every phase.

**2. Assignments do not materialize into `public.homework`.**
`homework.lesson_id` and `homework.subject_id` are both `NOT NULL` FKs to student-owned rows, so materializing would mean inventing a synthetic lesson *and* subject per student, leaking into `lessons`, `statistics`, `grades`, `search` and achievements. Worse, `homework` is fully student-writable — the student could delete the teacher's assignment. Assignments stay in their own tables and surface on `/homework/list` as a separate, read-only **"From your teachers"** section.

**3. The join code lives in its own table (`class_join_codes`).**
Postgres has no column-level RLS. If the code sat on `teacher_classes`, every enrolled student could read it — making rotation after a leak pointless.

**4. Role is nullable + a one-time onboarding step, because OAuth signup has no form.**
`signInWithOAuth` in [auth.mutations.ts:51](src/actions/auth.mutations.ts:51) redirects straight to Google/Azure — there is no place to put a role picker. So `profiles.role` is **nullable**; existing rows are backfilled to `'student'`; a null role means "not chosen yet" and the middleware sends that user to `/onboarding/role` once. A `set_my_role()` RPC writes it only when currently null; an immutability trigger locks it forever after.
Onboarding asks for **one thing only: the application role.** It never asks for a teacher, a join code, or a class, and a student finishes it in a single click straight into `/dashboard/overview`. Same for the register form — picking "Student" means *"I use Lessonio as a student"*, not *"I have a teacher"*.

**5. Role in middleware = a profiles fetch, gated by prefix — not a JWT claim (yet).**
The custom access-token hook requires Supabase Dashboard config that is not reproducible from `supabase/migrations/`. The fetch runs *only* when the requested segment is role-relevant (`teaching/*`, `classroom/*`, `onboarding/*`, `home`, and the signed-out-only routes), so existing student routes cost exactly what they cost today. Deferred to Phase 5 as a pure perf win. **Middleware gating is UX, not security — RLS is the boundary.**

---

## Permanent scope statement (write this into the migration comments)

A teacher **can** see: their own `teacher_classes` and `class_join_codes`; `class_enrollments` for those classes; `full_name` / `avatar_url` of students enrolled in them; `assignments` in their classes; `assignment_submissions` to those assignments.

A teacher **cannot** see any row of `lessons`, `lesson_notes`, `attachments`, `flashcards`, `study_sessions`, `homework`, `exams`, `subjects`, `classes`, `class_occurrences`, `goals`, `user_achievements`, `notifications`, `settings`, `tags`. **No migration in this plan adds a policy to any of those tables** — they keep their untouched `user_id = (select auth.uid())` predicates. A teacher only ever sees what a student explicitly submitted to that teacher's assignment.

Symmetrically, a **student's** access to teacher-owned data is determined solely by their enrollment rows. A student with zero enrollments matches zero teacher-owned rows — and that costs them nothing, because their own data was never governed by these policies in the first place.

---

## Phase 1 — Role foundation (zero behavior change for existing users)

### Migration `supabase/migrations/20260822120000_profiles_role.sql`

1. `alter table public.profiles add column role text check (role in ('student','teacher'));` — nullable by design (decision 4).
2. `update public.profiles set role = 'student' where role is null;` — backfill every existing user.
3. `create index idx_profiles_role on public.profiles (role);`
4. **Reissue `handle_new_user()` in full** (never edit an applied migration — precedent: `20260820160000` reissues `sync_user_achievements`). Add a whitelisted role read, since `raw_user_meta_data` is client-supplied:
   `case when new.raw_user_meta_data->>'role' in ('student','teacher') then new.raw_user_meta_data->>'role' else null end`
5. `enforce_profile_role_immutable()` — `BEFORE UPDATE`; allows `null → 'student'|'teacher'` exactly once, raises `42501` on any other change. Needed because the existing `"Users can update their own profile"` policy has no column scope.
6. `public.set_my_role(p_role text)` — `security definer`; writes only when the current role is null; `revoke from public, anon`, `grant to authenticated`.
7. **`public.current_app_role()`** — `stable security definer set search_path = public`, returns `role from profiles where id = auth.uid()`. This is the anti-recursion primitive every later policy is built on.

Then `bun run supabase:types` (requires `SUPABASE_PROJECT_ID`). `Enums: {}` stays empty — text + CHECK matches every other enum-like column in this schema.

### App layer

- **[src/lib/types/user.ts](src/lib/types/user.ts)** — add `APP_ROLES = ["student","teacher"] as const` + `AppRole`, following the `STUDY_STATUSES` pattern in [lesson.ts](src/lib/types/lesson.ts); `User` gains `role: AppRole | null`.
- **[src/actions/auth.ts](src/actions/auth.ts)** — `mapUser()` maps `role`. The existing `select("*")` already returns it; no extra query.
- **NEW `src/actions/auth.guards.ts`** (`import "server-only"`, *not* `"use server"` — that would forbid the type exports; precedent: `class-occurrences.generate.ts`). Exports `requireUser(supabase)` and `requireRole(supabase, role)` returning `{ userId, role } | { error }` — deliberately the same shape as the private `getAuthedUserId()` in [classes.mutations.ts](src/actions/classes.mutations.ts), so the ~27 sites inlining `if (error || !data.user)` become a mechanical drop-in later. Wrap the profile lookup in React `cache()`.
  *Do not refactor the 27 existing sites in Phase 1* — new teacher code uses the helper; convert the rest in a separate follow-up commit.
- **[src/lib/validations/auth.ts](src/lib/validations/auth.ts)** — `createRegisterSchema` gains `role: z.enum(APP_ROLES, { message: t("errors.roleRequired") })`. `RegisterInput` is `z.infer<...>` so it updates for free.
- **[src/actions/auth.mutations.ts](src/actions/auth.mutations.ts)** — `register()` whitelists server-side (`input.role === "teacher" ? "teacher" : "student"`) and passes it in `options.data`. *(Noted in passing: `register` currently passes only `full_name`, not `timezone`/`locale`, though `handle_new_user()` reads both — pre-existing gap, out of scope.)*
- **[modules/auth/register/csr/RegisterForm.tsx](modules/auth/register/csr/RegisterForm.tsx)** — a `role` `FormField` above `fullName`, defaulting to `student`. **There is no `radio-group` in `src/components/ui/`** — build two selectable cards from `Button`/`Card` with `aria-pressed` and `type="button"` writing via `field.onChange`, rather than adding a Radix dependency. Include a "this can't be changed later" note.

### Routing & nav

- **[src/lib/constants/navigation.ts](src/lib/constants/navigation.ts)** — `NavItem` gains `roles: readonly AppRole[]`; add `ROLE_HOME = { student: "/dashboard/overview", teacher: "/teaching/classes" }`. All 13 study domains get `roles: ["student"]`; `notifications`, `settings`, `help` get `APP_ROLES`.
  **`roles` is the only predicate — never an enrollment count.** The student's home stays `/dashboard/overview` and their nav keeps all 13 study domains regardless of whether they have a teacher.
  ⚠️ **`isActivePath` gotcha:** when a domain has >1 nav sibling it requires `pathname.split("/")[2]` to match, so `/teaching/roster/[id]` would highlight *nothing*. Add a fallback in Phase 2: if no sibling's second segment matches, highlight the domain's first sibling.
- **[src/components/shared/app-sidebar.tsx](src/components/shared/app-sidebar.tsx)** — props widen to include `role`; filter `NAV_ITEMS` by it; the hardcoded `/dashboard/overview` logo href becomes `ROLE_HOME[role]`.
- **No `(teacher)` route group.** Teachers share the `(app)` shell — same sidebar, bell, search, settings, help. Teacher routes live at `src/app/[locale]/(app)/teaching/*`.
- **[src/lib/supabase/middleware.ts](src/lib/supabase/middleware.ts)** — add `ROLE_PREFIXES` (`teaching → teacher`, later `classroom → student`) and `ROLE_NEUTRAL_ENTRY = "home"`. After the existing signed-out redirect: compute `needsRole`; **only then** query `select("role")`; null role → `/onboarding/role`; `/home` → `ROLE_HOME[role]`; signed-in on a `SIGNED_OUT_ONLY_SEGMENT` → `ROLE_HOME[role]` (replacing the hardcoded path); prefix mismatch → `ROLE_HOME[role]`.
  Phase 1 registers **only** `teaching`, which has no pages yet — so no existing route changes behavior.
  The role map gates on **role alone**. `classroom/*` requires `role = 'student'`, never an enrollment — the middleware must not query `class_enrollments`, and an unenrolled student loads those routes normally.
- **NEW role-neutral entry** `src/app/[locale]/(app)/home/page.tsx` → `modules/home/redirect/ssr/HomeRedirect.tsx` (`Actions.Auth.getSession()` → `redirect({ href: ROLE_HOME[role], locale })` from `@/i18n/navigation`). Defense-in-depth for App-Router-cache navigations, matching the existing `(app)/layout.tsx` guard.
- **NEW `src/app/[locale]/(app)/onboarding/role/page.tsx`** → `modules/onboarding/role/*` — the same two-card picker as the register form, calling `set_my_role` then redirecting to `/home`. This is the OAuth path.
- **Swap `/dashboard/overview` → `/home`** as the post-auth fallback in: [auth.mutations.ts:61](src/actions/auth.mutations.ts:61), [src/app/api/auth/callback/route.ts](src/app/api/auth/callback/route.ts), `modules/auth/login/csr/LoginForm.tsx`, the signed-in bounces in `modules/auth/*/ssr/*`, and the landing CTA in `src/app/[locale]/page.tsx`.

### i18n (both `messages/en.json` and `messages/ar.json`)

`auth.register.{roleLabel, roleStudent, roleStudentHint, roleTeacher, roleTeacherHint, roleImmutableNote, errors.roleRequired}`, `onboarding.role.*`, `nav.{teachingClasses, teachingAssignments}`.

**Exit criteria:** `bun run type-check && bun run lint && bun run build` clean. Existing user signs in → identical app. New signup can pick teacher → lands on `/teaching/classes` (404 until Phase 2), sidebar shows only Notifications/Settings/Help. OAuth signup → `/onboarding/role` once, never again.

---

## Phase 2 — Teacher classes, join codes, roster

### Migration `supabase/migrations/20260823120000_teacher_classes.sql`

| Table | Key columns |
|---|---|
| `teacher_classes` | `teacher_id`→auth.users, `name` (1–120), `subject_label` free text (**not** a FK to student-owned `subjects`), `description`, `is_archived` |
| `class_join_codes` | PK `teacher_class_id`, `code text unique check (code ~ '^[A-Z0-9]{6}$')`, `rotated_at` |
| `class_enrollments` | `teacher_class_id`, `student_id`, `status in ('active','removed')`, `joined_at`, `unique (teacher_class_id, student_id)` |

All get `set_updated_at` triggers per repo convention.

**RPCs** (all `security definer set search_path = public`, `revoke execute from public, anon`, `grant to authenticated`, explicit `auth.uid()` guard inside):
- `generate_join_code()` — alphabet `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (31 chars, no I/L/O/0/1), 6 chars ≈ 887M. Loops up to 10× checking for collisions; the `unique` index is the real guarantee, so callers must also catch `unique_violation` and retry once (the SELECT/INSERT gap is not atomic).
- `create_teacher_class(...)` — guards `current_app_role() = 'teacher'`; inserts class + code in one transaction.
- `rotate_join_code(class_id)`, `join_class_by_code(code)` (normalizes to upper/alphanumeric, guards student role, `on conflict ... do update set status='active'` so re-joining works, raises `invalid_join_code`), `leave_class(class_id)` (sets `status='removed'`; never deletes — submissions must survive).

**Anti-recursion helpers** — `is_teacher_of_class(id)`, `is_enrolled_in_class(id)`, `shares_teacher_class_with(profile_id)`, all `stable security definer`.

> **The recursion pitfall, stated plainly.** `teacher_classes.SELECT` must be visible to enrolled students → consults `class_enrollments`; `class_enrollments.SELECT` must be visible to the owning teacher → consults `teacher_classes`. As inline subqueries each policy re-enters the other and Postgres raises `42P17 infinite recursion detected in policy`. `SECURITY DEFINER` helpers run as the owner and skip RLS, breaking the cycle. **Every cross-table predicate in this feature must go through a definer helper — never an inline subquery.** Same for `current_app_role()` reading `profiles` from inside a `profiles` policy.

**Policies**
- `teacher_classes` — SELECT: `teacher_id = auth.uid() or is_enrolled_in_class(id)`; INSERT: owner **and** `current_app_role() = 'teacher'`; UPDATE/DELETE: owner.
- `class_join_codes` — SELECT/UPDATE/DELETE: `is_teacher_of_class(...)`. **No INSERT policy** (rows come only from the RPC — precedent: `notifications`, `profiles`, `settings`).
- `class_enrollments` — SELECT: `student_id = auth.uid() or is_teacher_of_class(...)`; UPDATE: teacher only (remove/restore). **No INSERT/DELETE** — RPCs only. Plus a `BEFORE UPDATE` trigger pinning `teacher_class_id`/`student_id` (no column RLS).
- `profiles` — **one** additive policy: `"Users can view profiles they share a class with" using (shares_teacher_class_with(id))`. This is the single deliberate cross-user read, exposing only display fields.

### App layer — flagship module (repeat this shape for every later teacher module)

Types `src/lib/types/teacher-class.ts` (`TeacherClass`, `TeacherClassWithStats`, `CreateTeacherClassInput`, `UpdateTeacherClassInput`) and `src/lib/types/enrollment.ts` (`ENROLLMENT_STATUSES as const`, `Enrollment`, `RosterEntry`, `JoinClassInput`).

Validations `src/lib/validations/teacher-class.ts` → `createTeacherClassSchema(t)` (keys under `teaching.classes.form`); `src/lib/validations/enrollment.ts` → `createJoinClassSchema(t)` with `.trim().toUpperCase().regex(/^[A-Z0-9]{6}$/)`.

Actions — the mandatory pair, modeled on [src/actions/classes.ts](src/actions/classes.ts):
- `src/actions/teacher-classes.ts` (`import "server-only"`): `getAll()`, `getById()`, `getRoster(classId)` — bulk-join codes/counts/profiles, **no N+1**, mirroring `fetchSubjectsByIds`.
- `src/actions/teacher-classes.mutations.ts` (file-level `"use server"`): uses `requireRole(supabase, "teacher")`, calls `supabase.rpc(...)` for definer paths, ends with `revalidatePath("/", "layout")`.
- Same pair for `src/actions/enrollments.*` (student `getMyClasses`/`joinClass`/`leaveClass`, teacher `removeStudent`).
- Register both in [src/actions/index.ts](src/actions/index.ts).

Routes & modules:
```
src/app/[locale]/(app)/teaching/classes/page.tsx           thin <Suspense><Teaching.TeachingClasses/></Suspense>
src/app/[locale]/(app)/teaching/roster/[classId]/page.tsx  passes params Promise down, like classes/detail/[classId]
modules/teaching/classes/{ssr/TeachingClasses.tsx, csr/TeachingClassesView.tsx, index.ts}
modules/teaching/roster/{ssr/TeachingRoster.tsx, csr/TeachingRosterView.tsx, csr/columns.tsx, index.ts}
modules/teaching/components/{TeacherClassCard, TeacherClassFormDialog, DeleteTeacherClassDialog,
                             TeacherClassActionsMenu, JoinCodePanel}.tsx
modules/teaching/index.ts        + modules/index.ts: export * as Teaching from "./teaching";
```
`TeacherClassFormDialog` copies [ClassFormDialog.tsx](modules/classes/components/ClassFormDialog.tsx) structurally: `useMemo(() => createXSchema(t), [t])`, `useForm` + `zodResolver`, the **`wasOpen` adjust-state-during-render** reset (not `useEffect`), `useMutation` wrapping a *direct* import from `@/actions/teacher-classes.mutations` (never the barrel), `onSuccess → onOpenChange(false) + onSaved?.()`; the view calls `router.refresh()` from `@/i18n/navigation`. Delete uses [confirm-dialog.tsx](src/components/ui-system/confirm-dialog.tsx) and **throws** on failure.

The roster is the **first production consumer of [data-table.tsx](src/components/ui-system/data-table.tsx)** (zero today) — `createDataTableColumnHelper<RosterEntry>()`, `getRowId`, `emptyState`, a `DataTableRowAction` for "Remove". Budget extra time: the wrapper has never been exercised, and `DataTableRowData` is `Record<string, any>`, so a plain interface satisfies it only because the bound is `any`. **Compile the columns early, before building on it.**

Student slice: `/classroom/classes` (`modules/classroom/classes/*` + `modules/classroom/components/JoinClassDialog.tsx`). `NAV_ITEMS` gains `/classroom/classes` (student) and `/teaching/classes` (teacher); middleware registers the `classroom` prefix and the student-only gating goes live now that teachers have a home to bounce to; fix `isActivePath`.

**`/classroom/classes` is fully functional with zero enrollments** — it renders the existing [empty-state.tsx](src/components/ui-system/empty-state.tsx) with an inviting "Join a class" action opening `JoinClassDialog`. That is the *normal* view for most students, not a degraded one, so it gets real copy rather than an error tone. `getMyClasses()` returns `{ data: [], error: null }`. Nothing about this route is conditional on the student having a teacher, and no other part of the app changes when the list is empty.

i18n: new `teaching` and `classroom` namespaces in both files. `classroom.classes.empty.*` is written as a welcoming invitation ("Have a class code? Join your teacher's class"), never as a warning or a missing-setup prompt.

---

## Phase 3 — Assignments

`supabase/migrations/20260824120000_assignments.sql` — `assignments(teacher_class_id, teacher_id, title 1–160, instructions ≤5000, due_at timestamptz, total_points numeric(6,2), status in ('draft','published'), published_at)`. `due_at` is `timestamptz` not `date` — students span timezones.

SELECT policy: `is_teacher_of_class(...) or (status = 'published' and is_enrolled_in_class(...))` — **drafts are invisible to students; publishing is what "assigning work" means.** INSERT/UPDATE/DELETE: teacher of the class, plus a `BEFORE UPDATE` trigger pinning `teacher_class_id`/`teacher_id`.

App layer follows Phase 2's shape: `src/lib/types/assignment.ts` (`ASSIGNMENT_STATUSES as const`, `Assignment`, `AssignmentWithStats`, `AssignmentForStudent`), `src/lib/validations/assignment.ts`, `src/actions/assignments.{ts,mutations.ts}` (`getAll`, `getByClass`, `getById`, `getAssignedToMe`, `create/update/publish/unpublish/remove`), routes `/teaching/assignments` and `/classroom/assignments` + `/classroom/assignment/[assignmentId]`, modules and dialogs mirroring the flagship.

**Surfacing to students — strictly additive.** [modules/homework/list/ssr/HomeworkList.tsx](modules/homework/list/ssr/HomeworkList.tsx) adds `Actions.Assignments.getAssignedToMe()` to its existing `Promise.all` and the view renders a distinct **"From your teachers"** section using a new read-only `src/components/ui-system/assignment-card.tsx` (sibling of `homework-card.tsx`). The two lists never merge — teacher work isn't student-editable, and the separation makes that legible.

The personal-homework system is untouched: same query, same layout, same position on the page. **When `getAssignedToMe()` returns `[]` the teacher section renders nothing at all** — no header, no placeholder, no "you have no teacher" copy. An independent student's `/homework/list` is byte-for-byte the page they have today. `/homework/list` must never require an enrollment to load.

`/classroom/assignments` follows the same rule as `/classroom/classes`: it loads for any student, showing a plain empty state when they have no classes or no published assignments.

**Dashboard:** `src/actions/dashboard.ts` gains an `assignedWork` slice, skipped entirely when `role !== "student"`. The existing student dashboard remains *the* dashboard for every student — today's lessons, upcoming lessons, goals, study sessions and personal homework keep their current order and layout. Teacher-assigned work is appended as one extra card, and **when `assignedWork` is empty the card is not rendered**, leaving the dashboard visually identical to today's. Teacher data never replaces or reorders an existing section.

---

## Phase 4 — Submissions & grading

`supabase/migrations/20260825120000_assignment_submissions.sql` — `assignment_submissions(assignment_id, student_id, content ≤20000, submitted_at, score numeric(6,2), feedback ≤5000, graded_at, graded_by)`, `unique (assignment_id, student_id)`, plus a partial index `where graded_at is null` for the grading queue. Helper `can_submit_assignment(id)` — published **and** enrolled.

Policies: SELECT `student_id = auth.uid() or is_teacher_of_assignment(...)`; INSERT student + `can_submit_assignment`; UPDATE either party; DELETE student only while `graded_at is null`.

**The column-scope problem — the most security-sensitive object in this feature.** With no column-level RLS, that single UPDATE policy would let a student write their own `score` and a teacher rewrite `content`. A `BEFORE UPDATE` trigger `enforce_submission_write_scope()` splits the paths: the student branch rejects any change to `score`/`feedback`/`graded_at`/`graded_by` and rejects edits once `graded_at` is set; the teacher branch rejects changes to `content`/`submitted_at`, stamps `graded_by := auth.uid()` and `graded_at := now()`, and validates `score <= assignments.total_points` (cross-table, so it cannot be a CHECK). Both branches pin `assignment_id`/`student_id`.

App layer: `src/lib/types/submission.ts` with `SUBMISSION_STATUSES = ["assigned","submitted","graded"]` **derived in the mapper** from `submitted_at`/`graded_at`, not stored — no redundant column to drift. `src/actions/submissions.{ts,mutations.ts}` — `getByAssignment()` **left-joins the roster so non-submitters appear as `assigned`** (a grading queue must show who hasn't turned in). Route `/teaching/grading/[assignmentId]` (second `DataTable` consumer) + `GradeSubmissionDialog`. Student sees score and feedback read-only once graded.

*Cache note:* `revalidatePath("/", "layout")` only clears the **acting** user's Router Cache — a teacher grading does not revalidate the student's. Harmless here: all these routes are cookie-dependent and uncached, so the student sees it on their next request.

---

## Phase 5 — Hardening (optional, after the feature works)

1. **JWT custom access-token hook** injecting `user_role`; middleware drops the profiles query. Needs a deploy runbook — not reproducible from migrations alone.
2. **Notifications** — new types `assignment_assigned`, `assignment_graded`. `notifications` has no INSERT policy for `authenticated` by design, so write them via a `SECURITY DEFINER` function, **not** the service-role client ([admin.ts](src/lib/supabase/admin.ts)'s own doc comment warns against that). Also add `.eq("role","student")` to the sweep in [notifications.jobs.ts](src/actions/notifications.jobs.ts) so teachers aren't scanned for reminders they structurally cannot have.
3. **Submission attachments** — note the current storage SELECT policy is `bucket_id = 'attachments'` for *all* authenticated users, so any user can already read any object given the path. Worth tightening independently of this feature.
4. Link a teacher class into a student's own schedule (nullable `classes.teacher_class_id`).
5. Global search returns nothing for teachers — hide it or extend it over `teacher_classes`/`assignments`.
6. **Account deletion** — `deleteAccount` would cascade a teacher's classes → assignments → submissions, destroying students' work. Decide: block while classes exist, or archive-and-orphan.
7. Help Center and `/docs` are student-framed; add teacher topics.

---

## Empty states that must work (Phase 2/3 UI acceptance)

Each of these is a **valid, supported, non-exceptional** state. None may break, block, redirect or restrict the core student application:

| State | Expected |
|---|---|
| Student who has never joined a class | Full student app. `/classroom/*` loads with a welcoming empty state + "Join a class". No teacher section anywhere else. |
| Student with zero teacher classes | Same as above — this is the default and most common student. |
| Student with classes but zero assignments | `/classroom/assignments` shows an empty state; `/homework/list` teacher section hidden; dashboard card hidden. |
| Student with assignments but zero submissions | Assignments listed as `assigned`; nothing implies fault or error. |
| Student who leaves all classes | Returns cleanly to the independent-student experience. `leave_class()` sets `status='removed'` and **never deletes**, so historical submissions stay intact. |
| Teacher with zero classes | `/teaching/classes` empty state + "Create a class". |
| Teacher with a class but zero students | Roster empty state showing the join code prominently. |

---

## Verification

```bash
bun run type-check && bun run lint && bun run build
```

After every migration: `bun run supabase:types` (needs `SUPABASE_PROJECT_ID`). Locally `supabase db reset`; to the linked project `supabase db push`. **Never edit an applied migration** — reissue functions in a new file.

**Manual end-to-end — three personas, all must pass (after Phase 4):**

*A. Independent student (the regression guard — run this one first)*
1. Register as `student`; **join nothing**.
2. Land on the normal `/dashboard/overview`; sidebar shows all 13 study domains.
3. Use lessons, subjects, personal homework, exams, goals, study sessions, flashcards, calendar, statistics, grades, achievements, search, settings — all behave exactly as before this feature.
4. `/classroom/classes` → welcoming empty state with a "Join a class" action; no error, no forced dialog.
5. `/classroom/assignments` → empty state.
6. `/homework/list` and `/dashboard/overview` show **no teacher section at all** — visually identical to pre-feature.
7. No redirect, banner, interstitial or nag anywhere pushes toward joining a class.
8. Confirm zero teacher-owned rows are readable.

*B. Teacher-connected student*
1. Register as `student`, join a class with a valid code (wrong code → translated error; joining twice is idempotent).
2. **Re-run every check in A steps 3 — all existing student functionality unchanged.**
3. Class appears in `/classroom/classes`; published assignments appear in `/classroom/assignments`, under "From your teachers" on `/homework/list`, and as an extra dashboard card — with the personal sections untouched and in their original order.
4. Submit an assignment; after the teacher grades it, score and feedback are visible and the submission is no longer editable.
5. Leave the class → cleanly returns to the independent-student experience of persona A; historical submissions remain intact in the DB.

*C. Teacher*
1. Register as `teacher` → lands on `/teaching/classes`; sidebar shows only Classes/Assignments/Notifications/Settings/Help.
2. Create a class → code renders, copy works, rotate invalidates the old one.
3. Student joins → roster lists them with name and avatar (the one new `profiles` policy).
4. Draft assignment is invisible to students → publish → it appears for them.
5. Grading queue shows submitters as *submitted* and non-submitters as *assigned*; grade one.
6. Existing student signs in → identical app; `/teaching/classes` redirects to `/dashboard/overview`.
7. OAuth signup → `/onboarding/role` once, asking only for the role, then never again.

**Negative tests — every one must fail:**
teacher B reading class A's submissions · student `PATCH`ing their own `score` · teacher `PATCH`ing `content` · student `SELECT`ing `class_join_codes` · anyone `UPDATE`ing a non-null `profiles.role` · submitting to an unpublished assignment · a removed student submitting · `score > total_points`.
Then confirm a teacher can read **zero** rows of `lessons`, `flashcards`, `study_sessions`, `exams`, `homework`, `subjects`, `settings`, `notifications`.

Per the repo README, retest desktop/mobile × en/ar (RTL) × light/dark × empty/loading/error states.

---

## Risks

| Risk | Mitigation |
|---|---|
| **RLS recursion (42P17)** across `teacher_classes` ↔ `class_enrollments` ↔ `profiles` | Every cross-table predicate goes through a `STABLE SECURITY DEFINER` helper. Test each policy in isolation right after `db reset`. |
| **No column-level RLS** on submissions and `profiles.role` | `BEFORE UPDATE` triggers. `enforce_submission_write_scope()` is the highest-priority test target in the whole feature. |
| **`raw_user_meta_data` is client-writable** post-signup | `handle_new_user()` whitelists; register whitelists server-side; the immutability trigger locks after first write. |
| **Scope creep coupling the student app to enrollment** — the easiest way to ruin this feature is a guard, redirect, banner or restructured dashboard that assumes every student has a teacher | Persona A in the verification plan is the standing regression guard, run first every time. Reviewer's rule on every diff: *if it breaks for a student who has never joined a class, it is wrong.* No middleware or layout may query `class_enrollments`. |
| **`DataTable` has zero production consumers** | Compile the roster columns before building on it. |
| **`isActivePath` breaks for multi-sibling domains** | First-sibling fallback in Phase 2. |
| **Teacher deletion destroys student submissions** | Phase 5 decision required; today's cascade matches repo convention but is destructive. |
| **en/ar key drift** | Both files are currently exactly 1992 lines — add a recursive key-parity check to the verification loop. |
| **Definer-function privilege leak** | Every helper: `stable`, `set search_path = public`, `revoke from public, anon`, `grant to authenticated`, explicit `auth.uid()` guard. Never grant to `anon`. |
