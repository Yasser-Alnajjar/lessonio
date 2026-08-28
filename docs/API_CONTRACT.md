# API Contract — Lessonio

**Purpose.** This document specifies the complete backend contract for Lessonio so that a Laravel
developer can rebuild the backend **without reading the Next.js codebase**. It is derived entirely
from repository inspection: 47 files under `src/actions/`, 38 SQL migrations, 2 route handlers, and
the middleware/auth layer.

**Status legend.** Every operation is marked:

- `IMPLEMENTED` — directly observed in code today.
- `INFERRED` — proposed for the Laravel API but not present in the current implementation
  (pagination, for example). Never assume an `INFERRED` behavior exists today.

**Scope note.** The current app has **no REST API**. It has two HTTP route handlers and ~100 Next.js
Server Actions / server-only modules that talk to Postgres through PostgREST. The endpoints below
are _proposed_; the "Current Implementation" block on each one records what exists now.

---

## 1. Architecture Overview

### 1.1 What exists today

```
Next.js 16 App Router
├── modules/**/ssr/*.tsx        (React Server Components)
│      └── Actions.<Domain>.<method>()      ← reads,  server-only
├── modules/**/csr/*.tsx        (Client Components + TanStack Query)
│      └── import { createX } from "@/actions/<domain>.mutations"
│                                            ← writes, "use server"
│
└── src/actions/**  ────────────────────────────────────┐
       │                                                │
       ├── supabase.from("table")…      PostgREST       │ THE ONLY
       ├── supabase.rpc("fn", …)        8 call sites    │ BACKEND
       ├── supabase.storage.from(…)     5 call sites    │ SURFACE
       ├── supabase.auth.*              Supabase Auth   │
       └── Resend SDK                   email           │
                                                        │
   Postgres: 24 tables · ~60 RLS policies · 26 functions │
             30 triggers · 1 pg_cron job                │
                            ────────────────────────────┘
```

Two facts make this migration unusually tractable:

1. **There are zero raw `fetch()` calls** in `src/` or `modules/`. The single grep match is a
   comment in `src/actions/index.ts`.
2. **The browser Supabase client (`src/lib/supabase/client.ts`) has zero importers.** It is dead
   code. No UI component anywhere reaches the database directly.

Therefore the entire backend surface is enumerable and closed: **~100 action functions + 8 RPCs +
5 storage calls + 2 route handlers.**

### 1.2 Target architecture

```
Next.js (unchanged components)
        ↓
src/actions/**            ← the seam: keep these signatures, swap the internals
        ↓  HTTP + Bearer token
Laravel /api/v1
        ↓
Controller → FormRequest → Policy → Service → Eloquent Model → Postgres
```

The `Actions` facade in `src/actions/index.ts` is the migration seam. Because every component
already calls `Actions.<Domain>.<method>()` or imports a `*.mutations` function, replacing the body
of those functions with HTTP calls leaves all UI code untouched. **Endpoint shapes below are chosen
to map 1:1 onto the existing action signatures** so that swap stays mechanical.

### 1.3 Recommended Laravel structure

```
app/
├── Http/
│   ├── Controllers/Api/V1/     one controller per domain
│   ├── Requests/               FormRequest per write operation (NEW — see §4.4)
│   ├── Resources/              API Resources producing the camelCase shapes in §7
│   └── Middleware/             EnsureRole, ResolveLocale
├── Models/                     24 Eloquent models (§8)
├── Policies/                   one per model — the RLS translation (§10)
├── Services/                   business logic ported from RPCs (§9)
├── Jobs/                       GenerateNotifications, SendNotificationEmail
├── Notifications/              Laravel notifications → the `notifications` table
├── Observers/                  the 30 DB triggers (§11)
└── Support/                    SM-2 scheduler, XP/streak math, grade scale
```

Recommended packages: **Laravel Sanctum** (auth), **Eloquent** + Postgres, **Laravel Scheduler**
(the cron sweep), **Laravel Filesystem** (S3-compatible storage). **Laravel Reverb is not needed** —
see §13.

---

## 2. Authentication

Full detail in §12. Summary:

| Aspect             | Today (Supabase)                                                | Laravel target                               |
| ------------------ | --------------------------------------------------------------- | -------------------------------------------- |
| Mechanism          | Supabase Auth, JWT in httpOnly cookies, refreshed in middleware | Sanctum bearer token                         |
| Roles              | `profiles.role` ∈ `student` \| `teacher` \| `NULL`              | same column, `EnsureRole` middleware         |
| Role in token      | `user_role` claim via `custom_access_token_hook`                | custom Sanctum claim                         |
| Password rules     | `min(8)` — **client-side only**                                 | FormRequest `min:8` (new server enforcement) |
| OAuth              | Google (wired), Azure (typed, no UI)                            | Laravel Socialite                            |
| Password reset     | Supabase's own mailer                                           | Laravel `ResetPassword` notification         |
| Email verification | not implemented in app code                                     | out of scope unless enabled                  |

**There is no `admin` role.** `APP_ROLES = ["student", "teacher"]`.

**Role is write-once.** A NULL role may be set exactly once (OAuth signups land on
`/onboarding/role`); any subsequent change is rejected by a database trigger. See §11.2.

---

## 3. API Conventions

### 3.1 Base URL and versioning

All endpoints are prefixed `/api/v1`. The frontend must read the base URL from a single environment
variable (e.g. `NEXT_PUBLIC_API_URL`) and the version must appear exactly once, in the API client's
base path — never hardcoded at call sites. This keeps a future `/api/v2` a one-line change in
`src/actions/`.

### 3.2 Request conventions

| Concern      | Convention                                                                                                                                                                              |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Content type | `application/json` except attachment upload (`multipart/form-data`)                                                                                                                     |
| Auth header  | `Authorization: Bearer <token>`                                                                                                                                                         |
| Locale       | `Accept-Language: ar \| en` — drives server-generated notification copy                                                                                                                 |
| Casing       | **Request and response bodies are `camelCase`.** The database is `snake_case`; API Resources do the translation. This matches the existing domain types exactly (`src/lib/types/*.ts`). |
| Dates        | ISO 8601. Date-only fields are `YYYY-MM-DD`; datetimes are full ISO with timezone.                                                                                                      |
| IDs          | UUID v4 strings throughout.                                                                                                                                                             |

### 3.3 Response envelope

The frontend consumes two envelopes today, defined in `src/lib/types/common.ts`:

```ts
interface ActionResult<T> {
  data: T | null;
  error: string | null;
}
interface MutationResult {
  success: boolean;
  error: string | null;
}
```

To keep the `src/actions/` swap mechanical, the API returns a **`data`-wrapped body** and the action
layer maps it into these envelopes:

```jsonc
// success — reads
{ "data": { /* resource */ } }

// success — writes with no returned row
{ "data": null }

// success — writes that must return a value (see §3.4)
{ "data": "0f8c…-uuid" }
```

Three domains use bespoke tri-field envelopes today and should be **normalized** to the standard
one during the port (the action layer reshapes them so components keep compiling):

| Current type                                            | File                           | Normalize to         |
| ------------------------------------------------------- | ------------------------------ | -------------------- |
| `UploadAttachmentResult` `{success, error, attachment}` | `attachments.mutations.ts:29`  | `{data: Attachment}` |
| `CreateNoteResult` `{success, error, note}`             | `lesson-notes.mutations.ts:25` | `{data: LessonNote}` |
| `CreateTagResult` `{success, error, tag}`               | `tags.mutations.ts:15`         | `{data: Tag}`        |

### 3.4 Writes that must return a value

Most mutations return `MutationResult`. These five return data and their endpoints must too:

| Operation                | Returns                          |
| ------------------------ | -------------------------------- |
| `joinClass`              | the joined class's UUID          |
| `rotateJoinCode`         | the new 6-character code         |
| `exportData`             | the full `UserDataExport` object |
| `liveSearch`             | `SearchResultItem[]`             |
| `getRecentNotifications` | `{items, unreadCount}`           |

### 3.5 Soft-empty reads — a required behavior

**This is the single most important convention in this document.**

Today, unauthenticated _reads_ do not error. They return empty data:

```ts
// src/actions/classes.ts — getAll()
if (error || !data.user) return { data: [], error: null };
// getById() returns { data: null, error: null }
```

Only _mutations_ return `"You must be signed in."` A Laravel API that returns `401` on every read
would break existing callers, several of which destructure `data` and render immediately.

**Contract:** each read endpoint below states its unauthenticated behavior explicitly. Endpoints
marked **soft-empty** must return `200` with `{"data": []}` or `{"data": null}` rather than `401`
when the token is missing or expired. This is a deliberate compatibility requirement, not an
oversight — revisit it only as a coordinated frontend change.

---

## 4. Error Format

### 4.1 Shape

```jsonc
{
  "message": "You are not authorized to update this class.",
  "errors": {
    // present on 422 only
    "title": ["The title field is required."],
  },
}
```

This is Laravel's native shape. The action layer maps `message` onto the `error` string the
frontend already renders.

### 4.2 Status codes

| Status | Meaning                                     | Current equivalent                                                                                |
| ------ | ------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `200`  | Success                                     | `{success: true}` / `{data}`                                                                      |
| `201`  | Resource created                            | — (today all writes return `{success: true}`)                                                     |
| `204`  | Deleted, no body                            | —                                                                                                 |
| `401`  | Unauthenticated (mutations only — see §3.5) | `"You must be signed in."`                                                                        |
| `403`  | Authenticated but not permitted             | `"You do not have access to this action."`, or a Postgres `42501`                                 |
| `404`  | Not found **or** not visible to this user   | `"Class not found."` — RLS makes these indistinguishable today, and that must be preserved (§4.3) |
| `409`  | Conflict — unique violation                 | Postgres `23505`                                                                                  |
| `422`  | Validation failure                          | **nothing today** — see §4.4                                                                      |
| `500`  | Server error                                | raw Supabase `error.message`                                                                      |

### 4.3 404 vs 403 — do not "fix" this

Under RLS, a row you do not own is _invisible_, not forbidden. `SELECT … WHERE id = ?` simply
returns zero rows, and the action reports `"Class not found."` Returning `403` in Laravel where
Supabase returns "not found" would leak the existence of other users' records. **Policies must
return 404 for rows outside the user's scope**, reserving 403 for operations the user is
authenticated for but structurally may not perform (a student calling a teacher endpoint).

### 4.4 Validation errors are new

`src/actions/` imports Zod **zero times**. All 13 schemas in `src/lib/validations/` are
_client-side form_ schemas, built at render time from `useTranslations`. Nothing validates a payload
server-side today; the database CHECK constraints are the only backstop, and they surface as raw
Postgres error strings.

Every write endpoint below therefore carries a **FormRequest rule table**, derived from the Zod
schema plus the DB CHECK constraint. This is new enforcement, and it is the highest-value
correctness win of the migration. See the risk register (§20, `RISK-01`).

### 4.5 Error message leakage

Today raw Supabase/Postgres error strings reach the client verbatim (e.g. `login()` returns
`error.message` straight from `signInWithPassword`). The Laravel port should return curated
messages and log the underlying error. This is a behavior improvement — flag it to the frontend team
because a few UI strings are asserted against today.

---

## 5. Pagination, Filtering, Sorting

### 5.1 Pagination — `INFERRED`, does not exist today

`PaginatedResult<T>` is declared in `src/lib/types/common.ts` but **never used**. There are zero
`.range()` calls in the codebase. Lists are bounded by fixed `.limit()` constants instead:

| Constant              | Value        | Where                                       |
| --------------------- | ------------ | ------------------------------------------- |
| Notification center   | 50           | `notifications.ts` `CENTER_LIMIT`           |
| Notification bell     | 10           | `notifications.mutations.ts` `RECENT_LIMIT` |
| Search results        | 8            | `src/lib/search/query.ts` default           |
| Recent activity       | 8 per source | `dashboard.ts`                              |
| Class agenda upcoming | 5            | `getAgenda(upcomingLimit = 5)`              |
| Cron user sweep       | 1000         | `auth.admin.listUsers({perPage: 1000})`     |

**Everything else is unbounded** — `GET /lessons`, `/subjects`, `/homework`, `/exams`,
`/study-sessions` all return the user's full history.

Proposed (opt-in, backwards compatible): when `page` or `perPage` is present, paginate; when absent,
return the full list as today.

```http
GET /api/v1/lessons?page=1&perPage=25
```

```jsonc
{
  "data": [
    /* … */
  ],
  "meta": { "total": 213, "page": 1, "perPage": 25, "lastPage": 9 },
  "links": { "next": "/api/v1/lessons?page=2&perPage=25", "prev": null },
}
```

`meta` maps onto the existing `PaginatedResult<T>` fields (`total`, `page`, `pageSize`).

### 5.2 Filtering — `IMPLEMENTED`

Only two domains filter today, and both do it in the action's TypeScript signature rather than in
the URL. Query parameters mirror those interfaces exactly:

`LessonFilters` → `GET /api/v1/lessons?subjectId=&studyStatus=&reviewStatus=&tagIds[]=&dateFrom=&dateTo=`

`ClassOccurrenceFilters` → `GET /api/v1/class-occurrences?classId=&subjectId=&attendanceStatus=&examStatus=&dateFrom=&dateTo=`

All filters are optional and combine with AND. `tagIds` is a repeated parameter.

### 5.3 Sorting — `IMPLEMENTED` (fixed, not client-controlled)

No endpoint accepts a sort parameter today; each has a hardcoded order. Preserve these defaults
exactly, since UI code assumes them:

| Endpoint                    | Order                                                        |
| --------------------------- | ------------------------------------------------------------ |
| `GET /classes`              | `created_at ASC`                                             |
| `GET /lessons`              | `date DESC`                                                  |
| `GET /homework`             | `deadline ASC`                                               |
| `GET /exams`                | `date DESC`                                                  |
| `GET /study-sessions`       | `started_at DESC`                                            |
| `GET /notifications`        | `created_at DESC`                                            |
| `GET /class-occurrences`    | `date ASC, start_time ASC`                                   |
| `GET /flashcards/due`       | `due_date ASC`                                               |
| Recent activity (dashboard) | `updated_at DESC` per source, merged and re-sorted in memory |

A `sort` parameter may be added later; it is `INFERRED` and unused.

---

## 6. API Matrix

Complete inventory. `Auth` column: **N** = public, **Y** = authenticated. Role: **S** = student,
**T** = teacher, **—** = any authenticated user, **SYS** = machine/cron.

### 6.1 Authentication & Users

| ID       | Method | Endpoint                          | Auth | Role | Current implementation                                            | Laravel replacement                    | Status      |
| -------- | ------ | --------------------------------- | ---- | ---- | ----------------------------------------------------------------- | -------------------------------------- | ----------- |
| AUTH-001 | GET    | `/auth/me`                        | Y    | —    | `authActions.getSession()` — `auth.getUser()` + `profiles` select | `AuthController@me`                    | IMPLEMENTED |
| AUTH-002 | POST   | `/auth/login`                     | N    | —    | `login()` — `auth.signInWithPassword`                             | `AuthController@login` (Sanctum)       | IMPLEMENTED |
| AUTH-003 | POST   | `/auth/register`                  | N    | —    | `register()` — `auth.signUp` w/ `{full_name, role}` metadata      | `AuthController@register`              | IMPLEMENTED |
| AUTH-004 | POST   | `/auth/logout`                    | Y    | —    | `logout()` — `auth.signOut`                                       | `AuthController@logout`                | IMPLEMENTED |
| AUTH-005 | GET    | `/auth/oauth/{provider}/redirect` | N    | —    | `signInWithOAuth()` — `auth.signInWithOAuth`                      | `OAuthController@redirect` (Socialite) | IMPLEMENTED |
| AUTH-006 | GET    | `/auth/oauth/{provider}/callback` | N    | —    | `src/app/api/auth/callback/route.ts` — `exchangeCodeForSession`   | `OAuthController@callback`             | IMPLEMENTED |
| AUTH-007 | POST   | `/auth/forgot-password`           | N    | —    | `requestPasswordReset()` — `auth.resetPasswordForEmail`           | `PasswordResetController@send`         | IMPLEMENTED |
| AUTH-008 | POST   | `/auth/reset-password`            | Y¹   | —    | `resetPassword()` — `auth.updateUser({password})`                 | `PasswordResetController@reset`        | IMPLEMENTED |
| USER-001 | PATCH  | `/users/me`                       | Y    | —    | `updateProfile()` — `profiles.update`                             | `ProfileController@update`             | IMPLEMENTED |
| USER-002 | POST   | `/users/me/role`                  | Y    | —    | `setMyRole()` — RPC `set_my_role`                                 | `ProfileController@setRole`            | IMPLEMENTED |
| USER-003 | DELETE | `/users/me`                       | Y    | —    | `deleteAccount()` — **service-role** `auth.admin.deleteUser`      | `AccountController@destroy`            | IMPLEMENTED |

¹ AUTH-008 runs under the recovery session established by the emailed link, not a normal session.

### 6.2 Settings

| ID      | Method | Endpoint                             | Auth | Role | Current implementation                                         | Laravel replacement                                | Status      |
| ------- | ------ | ------------------------------------ | ---- | ---- | -------------------------------------------------------------- | -------------------------------------------------- | ----------- |
| SET-001 | GET    | `/settings`                          | Y    | —    | `settingsActions.get()` — `settings` select                    | `SettingsController@show`                          | IMPLEMENTED |
| SET-002 | PATCH  | `/settings/notification-preferences` | Y    | —    | `updateNotificationPreferences()` — whole-object jsonb replace | `SettingsController@updateNotificationPreferences` | IMPLEMENTED |
| SET-003 | PATCH  | `/settings/grade-scale`              | Y    | —    | `updateGradeScale()` — jsonb replace                           | `SettingsController@updateGradeScale`              | IMPLEMENTED |
| SET-004 | GET    | `/settings/export`                   | Y    | —    | `exportData()` — reads 16 tables                               | `DataExportController@show`                        | IMPLEMENTED |

### 6.3 Subjects, Lessons, Notes, Attachments, Tags

| ID         | Method | Endpoint                          | Auth | Role | Current implementation                                  | Laravel replacement              | Status      |
| ---------- | ------ | --------------------------------- | ---- | ---- | ------------------------------------------------------- | -------------------------------- | ----------- |
| SUBJ-001   | GET    | `/subjects`                       | Y²   | —    | `subjectsActions.getAll()` + 4 stat queries             | `SubjectController@index`        | IMPLEMENTED |
| SUBJ-002   | GET    | `/subjects/{id}`                  | Y²   | —    | `subjectsActions.getById()`                             | `SubjectController@show`         | IMPLEMENTED |
| SUBJ-003   | POST   | `/subjects`                       | Y    | —    | `createSubject()`                                       | `SubjectController@store`        | IMPLEMENTED |
| SUBJ-004   | PATCH  | `/subjects/{id}`                  | Y    | —    | `updateSubject()`                                       | `SubjectController@update`       | IMPLEMENTED |
| SUBJ-005   | DELETE | `/subjects/{id}`                  | Y    | —    | `deleteSubject()` — hard delete                         | `SubjectController@destroy`      | IMPLEMENTED |
| LESSON-001 | GET    | `/lessons`                        | Y²   | —    | `lessonsActions.getAll(filters?)` + bulk hydration      | `LessonController@index`         | IMPLEMENTED |
| LESSON-002 | GET    | `/lessons/{id}`                   | Y²   | —    | `lessonsActions.getById()`                              | `LessonController@show`          | IMPLEMENTED |
| LESSON-003 | POST   | `/lessons`                        | Y    | —    | `createLesson()` + `lesson_tags` insert                 | `LessonController@store`         | IMPLEMENTED |
| LESSON-004 | PATCH  | `/lessons/{id}`                   | Y    | —    | `updateLesson()`                                        | `LessonController@update`        | IMPLEMENTED |
| LESSON-005 | POST   | `/lessons/{id}/duplicate`         | Y    | —    | `duplicateLesson()`                                     | `LessonController@duplicate`     | IMPLEMENTED |
| LESSON-006 | POST   | `/lessons/{id}/archive`           | Y    | —    | `toggleArchiveLesson()` — read-modify-write             | `LessonController@toggleArchive` | IMPLEMENTED |
| LESSON-007 | DELETE | `/lessons/{id}`                   | Y    | —    | `deleteLesson()`                                        | `LessonController@destroy`       | IMPLEMENTED |
| LESSON-008 | PATCH  | `/lessons/{id}/reschedule`        | Y    | —    | `rescheduleLesson()` in `calendar.mutations.ts`         | `LessonController@reschedule`    | IMPLEMENTED |
| NOTE-001   | GET    | `/lessons/{lessonId}/notes`       | Y²   | —    | `notesActions.getAllForLesson()`                        | `LessonNoteController@index`     | IMPLEMENTED |
| NOTE-002   | POST   | `/lessons/{lessonId}/notes`       | Y    | —    | `createNote()` → returns the note                       | `LessonNoteController@store`     | IMPLEMENTED |
| NOTE-003   | PATCH  | `/notes/{id}`                     | Y    | —    | `updateNote()`                                          | `LessonNoteController@update`    | IMPLEMENTED |
| NOTE-004   | DELETE | `/notes/{id}`                     | Y    | —    | `deleteNote()`                                          | `LessonNoteController@destroy`   | IMPLEMENTED |
| ATTACH-001 | GET    | `/lessons/{lessonId}/attachments` | Y²   | —    | `attachmentsActions.getAllForLesson()` + `getPublicUrl` | `AttachmentController@index`     | IMPLEMENTED |
| ATTACH-002 | POST   | `/lessons/{lessonId}/attachments` | Y    | —    | `uploadAttachment()` — storage upload + row insert      | `AttachmentController@store`     | IMPLEMENTED |
| ATTACH-003 | DELETE | `/attachments/{id}`               | Y    | —    | `deleteAttachment()` — row + object delete              | `AttachmentController@destroy`   | IMPLEMENTED |
| TAG-001    | GET    | `/tags`                           | Y²   | —    | `tagsActions.getAll()`                                  | `TagController@index`            | IMPLEMENTED |
| TAG-002    | POST   | `/tags`                           | Y    | —    | `createTag(name)` → returns the tag                     | `TagController@store`            | IMPLEMENTED |

² Soft-empty when unauthenticated — see §3.5.

### 6.4 Classes, Occurrences, Calendar

| ID        | Method | Endpoint                      | Auth | Role | Current implementation                                      | Laravel replacement                   | Status      |
| --------- | ------ | ----------------------------- | ---- | ---- | ----------------------------------------------------------- | ------------------------------------- | ----------- |
| CLASS-001 | GET    | `/classes`                    | Y²   | —    | `classesActions.getAll()` + subject/teacher-class hydration | `ClassController@index`               | IMPLEMENTED |
| CLASS-002 | GET    | `/classes/{id}`               | Y²   | —    | `classesActions.getById()`                                  | `ClassController@show`                | IMPLEMENTED |
| CLASS-003 | POST   | `/classes`                    | Y    | —    | `createClass()` + materialization reset                     | `ClassController@store`               | IMPLEMENTED |
| CLASS-004 | PATCH  | `/classes/{id}`               | Y    | —    | `updateClass()` + purge future untouched occurrences        | `ClassController@update`              | IMPLEMENTED |
| CLASS-005 | POST   | `/classes/{id}/toggle-active` | Y    | —    | `toggleActiveClass()` — read-modify-write                   | `ClassController@toggleActive`        | IMPLEMENTED |
| CLASS-006 | DELETE | `/classes/{id}`               | Y    | —    | `deleteClass()` — cascades to occurrences                   | `ClassController@destroy`             | IMPLEMENTED |
| OCCUR-001 | GET    | `/class-occurrences`          | Y²   | —    | `classOccurrencesActions.getAll(filters?)`                  | `ClassOccurrenceController@index`     | IMPLEMENTED |
| OCCUR-002 | GET    | `/class-occurrences/{id}`     | Y²   | —    | `classOccurrencesActions.getById()`                         | `ClassOccurrenceController@show`      | IMPLEMENTED |
| OCCUR-003 | GET    | `/class-occurrences/agenda`   | Y²   | —    | `getAgenda(upcomingLimit = 5)`                              | `ClassOccurrenceController@agenda`    | IMPLEMENTED |
| OCCUR-004 | PATCH  | `/class-occurrences/{id}`     | Y    | —    | `updateClassOccurrenceStatus()`                             | `ClassOccurrenceController@update`    | IMPLEMENTED |
| OCCUR-005 | —      | _(internal)_                  | Y    | —    | `ensureClassOccurrencesForUser()` — lazy materialization    | `ClassOccurrenceMaterializer` service | IMPLEMENTED |
| CAL-001   | GET    | `/calendar/{year}/{month}`    | Y²   | —    | `calendarActions.getMonth(year, month)`                     | `CalendarController@month`            | IMPLEMENTED |

### 6.5 Teaching (teacher-facing)

| ID         | Method | Endpoint                                    | Auth | Role | Current implementation                                    | Laravel replacement                    | Status      |
| ---------- | ------ | ------------------------------------------- | ---- | ---- | --------------------------------------------------------- | -------------------------------------- | ----------- |
| TCLASS-001 | GET    | `/teaching/classes`                         | Y    | T    | `teacherClassesActions.getAll()`                          | `TeacherClassController@index`         | IMPLEMENTED |
| TCLASS-002 | GET    | `/teaching/classes/{id}`                    | Y    | T    | `teacherClassesActions.getById()`                         | `TeacherClassController@show`          | IMPLEMENTED |
| TCLASS-003 | GET    | `/teaching/classes/{id}/roster`             | Y    | T    | `teacherClassesActions.getRoster()`                       | `RosterController@index`               | IMPLEMENTED |
| TCLASS-004 | POST   | `/teaching/classes`                         | Y    | T    | `createTeacherClass()` — RPC `create_teacher_class`       | `TeacherClassController@store`         | IMPLEMENTED |
| TCLASS-005 | PATCH  | `/teaching/classes/{id}`                    | Y    | T    | `updateTeacherClass()`                                    | `TeacherClassController@update`        | IMPLEMENTED |
| TCLASS-006 | POST   | `/teaching/classes/{id}/archive`            | Y    | T    | `toggleArchivedTeacherClass()`                            | `TeacherClassController@toggleArchive` | IMPLEMENTED |
| TCLASS-007 | DELETE | `/teaching/classes/{id}`                    | Y    | T    | `deleteTeacherClass()`                                    | `TeacherClassController@destroy`       | IMPLEMENTED |
| TCLASS-008 | POST   | `/teaching/classes/{id}/rotate-code`        | Y    | T    | `rotateJoinCode()` — RPC `rotate_join_code`               | `JoinCodeController@rotate`            | IMPLEMENTED |
| ENROLL-004 | DELETE | `/teaching/classes/{id}/roster/{studentId}` | Y    | T    | `removeStudent()` — sets `status='removed'`               | `RosterController@destroy`             | IMPLEMENTED |
| ASSIGN-001 | GET    | `/teaching/assignments`                     | Y    | T    | `assignmentsActions.getAll()`                             | `AssignmentController@index`           | IMPLEMENTED |
| ASSIGN-004 | POST   | `/teaching/assignments`                     | Y    | T    | `createAssignment()`                                      | `AssignmentController@store`           | IMPLEMENTED |
| ASSIGN-005 | PATCH  | `/teaching/assignments/{id}`                | Y    | T    | `updateAssignment()` — class is immutable                 | `AssignmentController@update`          | IMPLEMENTED |
| ASSIGN-006 | POST   | `/teaching/assignments/{id}/publish`        | Y    | T    | `publishAssignment()` + RPC `notify_assignment_published` | `AssignmentController@publish`         | IMPLEMENTED |
| ASSIGN-007 | POST   | `/teaching/assignments/{id}/unpublish`      | Y    | T    | `unpublishAssignment()` — no notification                 | `AssignmentController@unpublish`       | IMPLEMENTED |
| ASSIGN-008 | DELETE | `/teaching/assignments/{id}`                | Y    | T    | `deleteAssignment()`                                      | `AssignmentController@destroy`         | IMPLEMENTED |
| SUBMIT-001 | GET    | `/teaching/assignments/{id}/submissions`    | Y    | T    | `submissionsActions.getByAssignment()` — full roster join | `SubmissionController@index`           | IMPLEMENTED |
| SUBMIT-004 | PATCH  | `/teaching/submissions/{id}/grade`          | Y    | T    | `gradeSubmission()` + RPC `notify_submission_graded`      | `SubmissionController@grade`           | IMPLEMENTED |

### 6.6 Classroom (student-facing)

| ID         | Method | Endpoint                                 | Auth | Role | Current implementation                                         | Laravel replacement                  | Status      |
| ---------- | ------ | ---------------------------------------- | ---- | ---- | -------------------------------------------------------------- | ------------------------------------ | ----------- |
| ENROLL-001 | GET    | `/classroom/classes`                     | Y    | S    | `enrollmentsActions.getMyClasses()`                            | `EnrollmentController@index`         | IMPLEMENTED |
| ENROLL-002 | POST   | `/classroom/classes/join`                | Y    | S    | `joinClass(code)` — RPC `join_class_by_code` → class UUID      | `EnrollmentController@join`          | IMPLEMENTED |
| ENROLL-003 | POST   | `/classroom/classes/{id}/leave`          | Y    | S    | `leaveClass()` — RPC `leave_class`                             | `EnrollmentController@leave`         | IMPLEMENTED |
| ASSIGN-002 | GET    | `/classroom/assignments`                 | Y    | S    | `assignmentsActions.getAssignedToMe()`                         | `StudentAssignmentController@index`  | IMPLEMENTED |
| ASSIGN-003 | GET    | `/assignments/{id}`                      | Y    | S/T  | `assignmentsActions.getById()`                                 | `StudentAssignmentController@show`   | IMPLEMENTED |
| SUBMIT-002 | GET    | `/classroom/assignments/{id}/submission` | Y    | S    | `submissionsActions.getMine()`                                 | `StudentSubmissionController@show`   | IMPLEMENTED |
| SUBMIT-003 | PUT    | `/classroom/assignments/{id}/submission` | Y    | S    | `submitAssignment()` — upsert on `(assignment_id, student_id)` | `StudentSubmissionController@upsert` | IMPLEMENTED |

### 6.7 Homework, Exams, Flashcards, Grades, Study Sessions

| ID          | Method | Endpoint                         | Auth | Role | Current implementation                                        | Laravel replacement                | Status      |
| ----------- | ------ | -------------------------------- | ---- | ---- | ------------------------------------------------------------- | ---------------------------------- | ----------- |
| HW-001      | GET    | `/homework`                      | Y²   | —    | `homeworkActions.getAll()`                                    | `HomeworkController@index`         | IMPLEMENTED |
| HW-002      | POST   | `/homework`                      | Y    | —    | `createHomework()` — derives `subject_id` from lesson         | `HomeworkController@store`         | IMPLEMENTED |
| HW-003      | PATCH  | `/homework/{id}`                 | Y    | —    | `updateHomework()`                                            | `HomeworkController@update`        | IMPLEMENTED |
| HW-004      | PATCH  | `/homework/{id}/completed`       | Y    | —    | `toggleHomeworkCompleted(id, completed)`                      | `HomeworkController@setCompleted`  | IMPLEMENTED |
| HW-005      | DELETE | `/homework/{id}`                 | Y    | —    | `deleteHomework()`                                            | `HomeworkController@destroy`       | IMPLEMENTED |
| EXAM-001    | GET    | `/exams`                         | Y²   | —    | `examsActions.getAll()`                                       | `ExamController@index`             | IMPLEMENTED |
| EXAM-002    | POST   | `/exams`                         | Y    | —    | `createExam()`                                                | `ExamController@store`             | IMPLEMENTED |
| EXAM-003    | PATCH  | `/exams/{id}`                    | Y    | —    | `updateExam()`                                                | `ExamController@update`            | IMPLEMENTED |
| EXAM-004    | PATCH  | `/exams/{id}/score`              | Y    | —    | `updateExamScore(id, score)`                                  | `ExamController@setScore`          | IMPLEMENTED |
| EXAM-005    | DELETE | `/exams/{id}`                    | Y    | —    | `deleteExam()`                                                | `ExamController@destroy`           | IMPLEMENTED |
| FLASH-001   | GET    | `/lessons/{lessonId}/flashcards` | Y²   | —    | `flashcardsActions.getByLesson()`                             | `FlashcardController@index`        | IMPLEMENTED |
| FLASH-002   | GET    | `/flashcards/decks`              | Y²   | —    | `flashcardsActions.getDecks()` — per-subject rollup           | `FlashcardController@decks`        | IMPLEMENTED |
| FLASH-003   | GET    | `/flashcards/due`                | Y²   | —    | `flashcardsActions.getDueQueue({subjectId?, lessonId?})`      | `FlashcardController@due`          | IMPLEMENTED |
| FLASH-004   | POST   | `/flashcards`                    | Y    | —    | `createFlashcard()`                                           | `FlashcardController@store`        | IMPLEMENTED |
| FLASH-005   | PATCH  | `/flashcards/{id}`               | Y    | —    | `updateFlashcard()`                                           | `FlashcardController@update`       | IMPLEMENTED |
| FLASH-006   | DELETE | `/flashcards/{id}`               | Y    | —    | `deleteFlashcard()`                                           | `FlashcardController@destroy`      | IMPLEMENTED |
| FLASH-007   | POST   | `/flashcards/{id}/reviews`       | Y    | —    | `recordFlashcardReview(id, grade)` — SM-2 update + review row | `FlashcardReviewController@store`  | IMPLEMENTED |
| GRADE-001   | GET    | `/grades/overview`               | Y²   | —    | `gradesActions.getOverview()` — GPA + trend                   | `GradeController@overview`         | IMPLEMENTED |
| SESSION-001 | GET    | `/study-sessions`                | Y²   | —    | `studySessionsActions.getHistory()`                           | `StudySessionController@index`     | IMPLEMENTED |
| SESSION-002 | GET    | `/study-sessions/running`        | Y²   | —    | `studySessionsActions.getRunning()`                           | `StudySessionController@running`   | IMPLEMENTED |
| SESSION-003 | GET    | `/study-sessions/summary`        | Y²   | —    | `studySessionsActions.getSummary()`                           | `StudySessionController@summary`   | IMPLEMENTED |
| SESSION-004 | POST   | `/study-sessions`                | Y    | —    | `startStudySession()`                                         | `StudySessionController@start`     | IMPLEMENTED |
| SESSION-005 | POST   | `/study-sessions/{id}/stop`      | Y    | —    | `stopStudySession()` — sets `ended_at`                        | `StudySessionController@stop`      | IMPLEMENTED |
| SESSION-006 | POST   | `/study-sessions/{id}/cancel`    | Y    | —    | `cancelStudySession()` — deletes the running row              | `StudySessionController@cancel`    | IMPLEMENTED |
| SESSION-007 | POST   | `/study-sessions/manual`         | Y    | —    | `logManualSession()`                                          | `StudySessionController@logManual` | IMPLEMENTED |
| SESSION-008 | PATCH  | `/study-sessions/{id}`           | Y    | —    | `updateStudySession()` — not in the barrel                    | `StudySessionController@update`    | IMPLEMENTED |
| SESSION-009 | DELETE | `/study-sessions/{id}`           | Y    | —    | `deleteStudySession()`                                        | `StudySessionController@destroy`   | IMPLEMENTED |

### 6.8 Notifications, Gamification, Aggregates, Search

| ID         | Method | Endpoint                       | Auth | Role | Current implementation                                                       | Laravel replacement                   | Status      |
| ---------- | ------ | ------------------------------ | ---- | ---- | ---------------------------------------------------------------------------- | ------------------------------------- | ----------- |
| NOTIF-001  | GET    | `/notifications`               | Y²   | —    | `notificationsActions.getAll()` — limit 50                                   | `NotificationController@index`        | IMPLEMENTED |
| NOTIF-002  | GET    | `/notifications/unread-count`  | Y²   | —    | `notificationsActions.getUnreadCount()`                                      | `NotificationController@unreadCount`  | IMPLEMENTED |
| NOTIF-003  | GET    | `/notifications/recent`        | Y²   | —    | `getRecentNotifications()` — limit 10 + generation side effect               | `NotificationController@recent`       | IMPLEMENTED |
| NOTIF-004  | POST   | `/notifications/{id}/read`     | Y    | —    | `markNotificationAsRead()`                                                   | `NotificationController@markRead`     | IMPLEMENTED |
| NOTIF-005  | POST   | `/notifications/read-all`      | Y    | —    | `markAllNotificationsAsRead()`                                               | `NotificationController@markAllRead`  | IMPLEMENTED |
| NOTIF-006  | POST   | `/notifications/{id}/email`    | Y    | —    | `sendNotificationToEmail()` — Resend                                         | `NotificationController@email`        | IMPLEMENTED |
| NOTIF-007  | POST   | `/internal/jobs/notifications` | Y³   | SYS  | `src/app/api/cron/notifications/route.ts` → `runScheduledNotificationsJob()` | `GenerateNotifications` scheduled job | IMPLEMENTED |
| NOTIF-008  | —      | _(internal)_                   | Y    | —    | `ensureNotificationsForUser()` — on-demand, throttled                        | `NotificationGenerator` service       | IMPLEMENTED |
| GAME-001   | GET    | `/gamification/achievements`   | Y²   | —    | `getAchievements()` — RPC `sync_user_achievements` then read                 | `AchievementController@index`         | IMPLEMENTED |
| GAME-002   | GET    | `/gamification/goals`          | Y²   | —    | `getGoals()`                                                                 | `GoalController@index`                | IMPLEMENTED |
| GAME-003   | POST   | `/gamification/goals`          | Y    | —    | `setCurrentGoal()` — upsert on `(user, period, period_start)`                | `GoalController@store`                | IMPLEMENTED |
| GAME-004   | PATCH  | `/gamification/goals/{id}`     | Y    | —    | `updateGoal()`                                                               | `GoalController@update`               | IMPLEMENTED |
| GAME-005   | DELETE | `/gamification/goals/{id}`     | Y    | —    | `deleteGoal()`                                                               | `GoalController@destroy`              | IMPLEMENTED |
| DASH-001   | GET    | `/dashboard/overview`          | Y²   | —    | `dashboardActions.getOverview()` — **~15 round trips**                       | `DashboardController@overview`        | IMPLEMENTED |
| STATS-001  | GET    | `/statistics/overview`         | Y²   | —    | `statisticsActions.getOverview()` — 6 scans, aggregated in JS                | `StatisticsController@overview`       | IMPLEMENTED |
| SEARCH-001 | GET    | `/search`                      | Y²   | —    | `searchActions.search(query)` — limit 8                                      | `SearchController@index`              | IMPLEMENTED |
| SEARCH-002 | GET    | `/search/live`                 | Y²   | —    | `liveSearch(query)` — command palette, same core                             | `SearchController@index` (shared)     | IMPLEMENTED |

³ NOTIF-007 authenticates with `Authorization: Bearer <CRON_SECRET>`, compared using
`timingSafeEqual`. It is not a user session.

### 6.9 Totals

| Category                   | Count   |
| -------------------------- | ------- |
| Public endpoints           | 6       |
| Authenticated, any role    | 78      |
| Teacher-only               | 17      |
| Student-only               | 7       |
| System/cron                | 1       |
| Internal (no HTTP surface) | 2       |
| **Total operations**       | **111** |

---

## 7. Domains

Each endpoint follows the same template. "Current Supabase Implementation" always cites the exact
file and function so a reader can verify the claim.

### 7.1 Authentication

#### POST /api/v1/auth/register — `AUTH-003`

**Purpose:** create an account. **Authentication:** public. **Authorization:** none.

**Request** (`application/json`):

```json
{
  "fullName": "Sara Ahmed",
  "email": "sara@example.com",
  "password": "correct-horse-battery",
  "role": "student"
}
```

| Field      | Rules                                | Source                 |
| ---------- | ------------------------------------ | ---------------------- |
| `fullName` | required, trimmed, `min:2`, `max:80` | `createRegisterSchema` |
| `email`    | required, valid email, unique        | `createRegisterSchema` |
| `password` | required, `min:8`                    | `createRegisterSchema` |
| `role`     | required, `in:student,teacher`       | `APP_ROLES`            |

`confirmPassword` is validated **client-side only** and is not sent to the API.

**Response** `201`: `{"data": null}`. The current UI shows a static success card and links to login;
it does not auto-authenticate.

**Errors:** `422` validation; `409` email already registered.

**Current Supabase Implementation** — `src/actions/auth.mutations.ts` → `register()`:
`auth.signUp({email, password, options: {data: {full_name, role}}})`. The role is re-whitelisted
server-side (`input.role === "teacher" ? "teacher" : "student"`), mirroring the database's own
whitelist in `handle_new_user()`. Two `auth.users` triggers then create the `profiles` and
`settings` rows.

**Laravel Implementation:**

```
AuthController@register
  ↓ RegisterRequest          (the rules table above)
  ↓ (no policy — public)
  ↓ RegistrationService::register()
  ↓ User::create() + Profile::create() + Setting::create()   ← replaces the two DB triggers
```

Wrap all three inserts in a transaction. The trigger-created `profiles`/`settings` rows are not
optional — a great deal of code assumes they exist.

**Database Tables:** `auth.users` (→ Laravel `users`), `profiles`, `settings`.

**RLS / Authorization Rules:** none on the write path; rows are created by `SECURITY DEFINER`
triggers that bypass RLS.

---

#### POST /api/v1/auth/login — `AUTH-002`

**Purpose:** exchange credentials for a token. **Authentication:** public.

**Request:** `{"email": "sara@example.com", "password": "…"}` — `email` required/valid,
`password` required.

**Response** `200`:

```json
{
  "data": {
    "token": "1|abc…",
    "user": { "id": "…", "email": "…", "role": "student" }
  }
}
```

The token replaces Supabase's cookie session. The action layer stores it and attaches it as
`Authorization: Bearer` on subsequent calls.

**Errors:** `422` validation; `401` invalid credentials.

**Current Supabase Implementation** — `auth.mutations.ts` → `login()`:
`auth.signInWithPassword({email, password})`, then `revalidatePath("/", "layout")`. **The raw
Supabase `error.message` is returned to the client verbatim** — see §4.5.

**Laravel Implementation:** `AuthController@login` → `LoginRequest` → `Auth::attempt()` →
`$user->createToken()`. Rate-limit this route (`throttle:6,1`); nothing rate-limits it today.

---

#### POST /api/v1/auth/logout — `AUTH-004`

Revokes the current token. `200` `{"data": null}`. Idempotent.
**Current:** `auth.mutations.ts` → `logout()` → `auth.signOut()`.
**Laravel:** `$request->user()->currentAccessToken()->delete()`.

---

#### GET /api/v1/auth/me — `AUTH-001`

**Purpose:** the current user plus their profile. **Authentication:** required, but see below.

**Response** `200`:

```json
{
  "data": {
    "id": "uuid",
    "email": "sara@example.com",
    "fullName": "Sara Ahmed",
    "avatarUrl": null,
    "timezone": "Africa/Cairo",
    "role": "student",
    "createdAt": "2026-08-01T09:00:00Z",
    "updatedAt": "2026-08-20T11:12:13Z"
  }
}
```

**Critical behavior:** when there is no session this returns `{"data": null, "error": null}` — **not**
`401`. `src/app/[locale]/(app)/layout.tsx` and several `ssr/` components branch on `data === null`
to decide whether to redirect. Returning `401` here changes control flow app-wide.

**Current Supabase Implementation** — `src/actions/auth.ts` → `authActions.getSession()`:
`auth.getUser()` then `profiles.select("*").eq("id", …).single()`. `mapUser()` merges the profile
row over `user_metadata` fallbacks for `full_name`, `avatar_url`, `timezone`.

**Laravel Implementation:** `AuthController@me` → `UserResource`. Register the route outside
`auth:sanctum` (or with an optional-auth middleware) so a missing token yields `200 {"data": null}`.

**Database Tables:** `auth.users`, `profiles`.

---

#### GET /api/v1/auth/oauth/{provider}/redirect — `AUTH-005`

**Purpose:** begin an OAuth flow. **Path param:** `provider` ∈ `google` | `azure`.
**Query:** `next` — optional post-login path.

`next` **must be sanitized**: rejected unless it starts with `/`, does not start with `//`, and does
not contain `://`. Falls back to `/home`. The helper is `getSafeRedirectPath()` in
`src/lib/utils.ts`; the middleware has an equivalent `isSafeNextPath`. This is an open-redirect
guard — reimplement it, do not drop it.

**Response** `302` to the provider.

**Current:** `auth.mutations.ts` → `signInWithOAuth()`. `redirectTo` is built as
`new URL("/api/auth/callback", NEXT_PUBLIC_APP_URL)` with `?next=`.

**Provider status:** only **Google** has a UI button (`src/components/shared/oauth-buttons.tsx`).
`azure` is reachable in the type (`OAuthProvider`) but has no entry point. Neither is configured in
`supabase/config.toml` — they exist only in the hosted dashboard, so local dev cannot exercise them.

**Laravel:** `OAuthController@redirect` → Socialite. Keep the provider allow-list explicit.

---

#### GET /api/v1/auth/oauth/{provider}/callback — `AUTH-006`

**Query:** `code` (required for success), `next` (optional, sanitized).

**Behavior**, exactly as implemented in `src/app/api/auth/callback/route.ts`:

1. `next = getSafeRedirectPath(searchParams.get("next"), "/home")`
2. if `code` present → exchange for a session; on success `302 → {origin}{next}`
3. any other outcome → `302 → {origin}/auth/login?error=oauth`

The login form reads `?error=oauth` and renders a translated message.

**Known defect to preserve or fix deliberately:** the redirect carries **no locale prefix**, so a
successful OAuth login always lands on the default locale (`ar`). Decide explicitly whether to keep
this.

**Post-condition:** a first-time OAuth user has `profiles.role = NULL`, so middleware sends them to
`/onboarding/role` (see `USER-002`).

---

#### POST /api/v1/auth/forgot-password — `AUTH-007`

Request `{"email": "…"}`. Always returns `200 {"data": null}` regardless of whether the address
exists — do not leak account existence.

**Current:** `requestPasswordReset()` → `auth.resetPasswordForEmail(email, {redirectTo: "${NEXT_PUBLIC_APP_URL}/auth/reset-password"})`.
The email is sent by **Supabase Auth's own mailer**, not Resend.

**Laravel:** `Password::sendResetLink()` with a custom `ResetPassword` notification. This is the one
email template that must be newly authored — Supabase provided it.

---

#### POST /api/v1/auth/reset-password — `AUTH-008`

Request `{"password": "…"}`, `min:8`.

**Important shape difference.** The current form submits _only_ a new password: it does not parse a
token, relying on the recovery session Supabase established from the emailed link
(`modules/auth/reset-password/csr/ResetPasswordForm.tsx`). Laravel's flow needs `token` and `email`
too, so this endpoint's request body **must change** to:

```json
{ "token": "…", "email": "…", "password": "…" }
```

and the reset page must read `token`/`email` from the query string. This is one of the few places
the frontend genuinely changes. Tracked as `RISK-06`.

**Response:** `200 {"data": null}`. The UI then routes to `/auth/login` after ~1.5s.

---

### 7.2 Users & Onboarding

#### PATCH /api/v1/users/me — `USER-001`

**Request:** `{"fullName": "Sara A.", "timezone": "Africa/Cairo"}`

| Field      | Rules                                                                |
| ---------- | -------------------------------------------------------------------- |
| `fullName` | required, trimmed, `min:2`, `max:80`                                 |
| `timezone` | required, non-empty (validate against `timezone_identifiers_list()`) |

**`role` is not accepted here** and must be rejected if present — the database trigger
`enforce_profile_role_immutable` blocks it, and the current action simply never writes it.

**Response** `200 {"data": null}`.

**Current:** `auth.mutations.ts` → `updateProfile()` — `profiles.update({full_name, timezone}).eq("id", uid)`.

**Laravel:** `ProfileController@update` → `UpdateProfileRequest` → `ProfilePolicy::update` (owner) →
`Profile::update()`.

**RLS translation:** `"Users can update their own profile"` — `USING id = auth.uid()` and
`WITH CHECK id = auth.uid()` → `ProfilePolicy::update(User $u, Profile $p) => $p->id === $u->id`.

---

#### POST /api/v1/users/me/role — `USER-002`

**Purpose:** one-time role selection for OAuth signups. **Authorization:** authenticated, and the
caller's role must currently be `NULL`.

**Request:** `{"role": "student"}` — `in:student,teacher`.

**Response** `200 {"data": null}`. **Errors:** `422` invalid value; `403` role already set.

**Current:** `src/actions/onboarding.mutations.ts` → `setMyRole()` → `rpc("set_my_role", {p_role})`.

The RPC (`SECURITY DEFINER`) does:

1. raise if `auth.uid()` is null;
2. raise `invalid role: %` (SQLSTATE `22023`) unless in `('student','teacher')`;
3. `update profiles set role = p_role where id = auth.uid() and role is null`;
4. raise `role already set` (SQLSTATE `42501`) when no row matched.

**Laravel:**

```
ProfileController@setRole
  ↓ SetRoleRequest           role: required|in:student,teacher
  ↓ ProfilePolicy::setRole   → $user->role === null       (403 otherwise)
  ↓ RoleService::assign()    → UPDATE … WHERE id = ? AND role IS NULL
```

Perform the null check **in the UPDATE's WHERE clause**, not as a read-then-write — the current
implementation is atomic and a naive port introduces a race.

---

#### DELETE /api/v1/users/me — `USER-003`

**Purpose:** permanently delete the account and all owned data.

**Guard — business rule, not authorization:** a teacher who still owns `teacher_classes` rows is
**refused**, because deleting them would cascade away their students' submissions. The current code
returns `{success: false, error: "teacher_has_classes"}` — a machine-readable sentinel the UI maps
to a translated message.

**Response** `200 {"data": null}` then the client discards its token.
**Errors:** `409 {"message": "teacher_has_classes"}` — keep the sentinel string.

**Current:** `src/actions/settings.mutations.ts` → `deleteAccount()`:

1. `auth.getUser()`
2. count `teacher_classes where teacher_id = uid`; if `> 0` → refuse
3. `createAdminClient().auth.admin.deleteUser(uid)` — **service-role, bypasses RLS**
4. `auth.signOut()` + `revalidatePath`

This is one of only **two** service-role call sites in the codebase (the other is the cron job). It
needs elevated rights because no RLS policy can permit a user to delete their own `auth.users` row.

**Laravel:** an ordinary `$user->delete()` inside a transaction — Laravel has no RLS, so no
privilege escalation is required. Rely on FK `ON DELETE CASCADE` (§8.3) to clear owned rows, and
verify the cascade map matches Postgres exactly.

---

### 7.3 Settings

#### GET /api/v1/settings — `SET-001`

**Response** `200`:

```json
{
  "data": {
    "userId": "uuid",
    "theme": "system",
    "locale": "ar",
    "notificationPreferences": {
      "enabledInBrowser": true,
      "enabledInEmail": false,
      "types": {
        "upcoming_lesson": true,
        "homework_due": true,
        "daily_reminder": true,
        "upcoming_class": true,
        "review_reminder": true,
        "assignment_assigned": true,
        "assignment_graded": true
      }
    },
    "gradeScale": [
      { "letter": "A", "minPercent": 90, "gradePoints": 4 },
      { "letter": "B", "minPercent": 80, "gradePoints": 3 },
      { "letter": "C", "minPercent": 70, "gradePoints": 2 },
      { "letter": "D", "minPercent": 60, "gradePoints": 1 },
      { "letter": "F", "minPercent": 0, "gradePoints": 0 }
    ]
  }
}
```

**Required defensive behavior:** `notification_preferences` is a jsonb blob that predates several of
its own keys. `parseNotificationPreferences()` in `src/lib/notifications/preferences.ts` fills
**every** missing key from `DEFAULT_NOTIFICATION_PREFERENCES` rather than trusting the stored row.
The Laravel Resource must do the same merge — older rows genuinely lack
`assignment_assigned` / `assignment_graded`.

Soft-empty: returns defaults, not `401`, when unauthenticated.

**Current:** `src/actions/settings.ts` → `settingsActions.get()`.

**RLS translation:** `"Users can view their own settings"` — `USING user_id = auth.uid()` →
`SettingPolicy::view` + a global `->where('user_id', auth()->id())` scope.

---

#### PATCH /api/v1/settings/notification-preferences — `SET-002`

**Request:** the complete `notificationPreferences` object (see above).

**This is a whole-object replace, not a merge** — the current action writes the entire jsonb column.
Preserve that, or the UI's "toggle one switch" flow (which sends the full object) will behave
inconsistently across the two implementations.

| Field              | Rules                                                 |
| ------------------ | ----------------------------------------------------- |
| `enabledInBrowser` | required, boolean                                     |
| `enabledInEmail`   | required, boolean                                     |
| `types`            | required, object; each of the 7 keys required boolean |

**Current:** `settings.mutations.ts` → `updateNotificationPreferences()`.

---

#### PATCH /api/v1/settings/grade-scale — `SET-003`

**Request:** `{"gradeScale": [{"letter": "A", "minPercent": 90, "gradePoints": 4}, …]}`

| Field                      | Rules                              |
| -------------------------- | ---------------------------------- |
| `gradeScale`               | required, array, `min:1`           |
| `gradeScale.*.letter`      | required, string, `max:2`          |
| `gradeScale.*.minPercent`  | required, numeric, `between:0,100` |
| `gradeScale.*.gradePoints` | required, numeric, `min:0`         |

Whole-array replace. There is no DB constraint on the shape — validation is entirely new.

**Current:** `settings.mutations.ts` → `updateGradeScale()`.

---

#### GET /api/v1/settings/export — `SET-004`

**Purpose:** "download my data". Returns every row the user owns.

**Response** `200` — `UserDataExport`, keyed by table, using **raw snake_case row shapes** (not the
camelCase domain types), plus `exportedAt`:

```jsonc
{
  "data": {
    "exportedAt": "2026-08-28T10:00:00Z",
    "profile": {
      /* profiles row */
    },
    "settings": {
      /* settings row */
    },
    "subjects": [],
    "classes": [],
    "classOccurrences": [],
    "lessons": [],
    "lessonNotes": [],
    "attachments": [],
    "studySessions": [],
    "homework": [],
    "exams": [],
    "tags": [],
    "lessonTags": [],
    "notifications": [],
    "goals": [],
    "achievements": [],
  },
}
```

16 collections. **Not included:** `teacher_classes`, `class_enrollments`, `assignments`,
`assignment_submissions`, `flashcards`, `flashcard_reviews`, `class_join_codes`. Whether that is
intentional is an open question (§21, `OQ-03`).

**Current:** `settings.mutations.ts` → `exportData()`.

**Laravel:** `DataExportController@show` → `DataExportService`. Consider streaming; the payload is
unbounded.

---

### 7.4 Subjects

All five operations share one authorization rule, so it is stated once:

**RLS translation (applies to SUBJ-001…005):**

```
Supabase:  user_id = (select auth.uid())   on SELECT / INSERT / UPDATE / DELETE

Laravel:   SubjectPolicy::{view,update,delete}(User $u, Subject $s)
               => $s->user_id === $u->id
           + a global scope:  Subject::where('user_id', auth()->id())
```

The scope matters as much as the policy: the current actions append
`.eq("user_id", uid)` to **every** query, so a missing row is a 404, never a 403 (§4.3).

#### GET /api/v1/subjects — `SUBJ-001`

Returns every subject the user owns, **including archived ones**, each with derived stats.

```jsonc
{
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "name": "Mathematics",
      "color": "#6366F1",
      "icon": "calculator",
      "isArchived": false,
      "creditHours": 3,
      "createdAt": "…",
      "updatedAt": "…",
      "stats": {
        "subjectId": "uuid",
        "totalLessons": 24,
        "attendanceRate": 92, // 0-100
        "studyRate": 71, // 0-100
        "homeworkProgress": 88, // 0-100
        "totalStudyMinutes": 1460,
      },
    },
  ],
}
```

Soft-empty (`{"data": []}`) when unauthenticated.

**Current:** `src/actions/subjects.ts` → `subjectsActions.getAll()`. Fetches the subject rows, then
runs **four bulk queries** (`lessons`, `class_occurrences`, `homework`, `study_sessions`) scoped by
`.in("subject_id", ids)` and computes the stats in TypeScript. This is deliberate N+1 avoidance.

**Laravel:** `SubjectController@index` → `SubjectService::listWithStats()`. Compute the four
aggregates in SQL (`withCount` / `selectRaw` sub-selects) rather than in PHP — this is a clear win
over the current implementation and changes no output.

Stat definitions, to reproduce exactly:

- `totalLessons` — count of the subject's lessons.
- `attendanceRate` — `attended / (occurrences with a non-null attendance_status) × 100`.
- `studyRate` — `lessons with study_status ∈ (completed, reviewed) / totalLessons × 100`.
- `homeworkProgress` — `completed homework / total homework × 100`.
- `totalStudyMinutes` — `SUM(study_sessions.duration_minutes)`.

Each is `0` when its denominator is zero.

#### GET /api/v1/subjects/{id} — `SUBJ-002`

Same object, single. `{"data": null}` when not found or not owned.
**Current:** `subjectsActions.getById()` — `.eq("id", id).eq("user_id", uid).maybeSingle()`.

#### POST /api/v1/subjects — `SUBJ-003`

```json
{
  "name": "Mathematics",
  "color": "#6366F1",
  "icon": "calculator",
  "creditHours": 3
}
```

| Field         | Rules                                 | Enforced today by |
| ------------- | ------------------------------------- | ----------------- |
| `name`        | required, `min:1`, `max:80`           | DB CHECK          |
| `color`       | required, `regex:/^#[0-9A-Fa-f]{6}$/` | DB CHECK          |
| `icon`        | required, `in:` the 10 icons below    | DB CHECK          |
| `creditHours` | required, numeric, `gt:0`             | DB CHECK          |

Icons: `book-open`, `calculator`, `flask-conical`, `globe`, `landmark`, `palette`, `code`, `music`,
`dumbbell`, `languages`.

`201 {"data": null}`. **Current:** `subjects.mutations.ts` → `createSubject()`.

#### PATCH /api/v1/subjects/{id} — `SUBJ-004`

Sparse update. Any subset of `name`, `color`, `icon`, `creditHours`, `isArchived`; same rules, all
`sometimes`. `isArchived` is the soft-delete flag.
**Current:** `updateSubject()` builds a sparse patch object and skips absent keys.

#### DELETE /api/v1/subjects/{id} — `SUBJ-005`

**Hard delete with a wide blast radius.** `subjects.id` cascades to `lessons`, which cascade to
`homework`, `exams`, `lesson_notes`, `attachments`, `flashcards`, and `lesson_tags`. It also
cascades to `classes` and `class_occurrences`, and **nulls** `study_sessions.subject_id`.

The UI warns before confirming; the API should not soften this — but it must reproduce the exact
cascade (§8.3). `204`.

---

### 7.5 Lessons

Same ownership rule as subjects: `user_id = auth.uid()` on all four commands →
`LessonPolicy` + `Lesson::where('user_id', auth()->id())`.

#### GET /api/v1/lessons — `LESSON-001`

**Query parameters** (all optional, AND-combined — mirrors `LessonFilters`):

| Param          | Type   | Notes                                                        |
| -------------- | ------ | ------------------------------------------------------------ |
| `subjectId`    | uuid   |                                                              |
| `studyStatus`  | enum   | `not_started` \| `studying` \| `completed` \| `reviewed`     |
| `reviewStatus` | enum   | `not_reviewed` \| `needs_review` \| `reviewed`               |
| `tagIds[]`     | uuid[] | repeated param; matches lessons having **any** of these tags |
| `dateFrom`     | date   | inclusive                                                    |
| `dateTo`       | date   | inclusive                                                    |

Order: `date DESC`. No pagination today.

```jsonc
{
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "subjectId": "uuid",
      "classOccurrenceId": null,
      "title": "Quadratic equations",
      "date": "2026-08-24",
      "studyStatus": "completed",
      "reviewStatus": "not_reviewed",
      "homeworkStatus": "none",
      "isArchived": false,
      "tagIds": ["uuid"],
      "subjectName": "Mathematics",
      "subjectColor": "#6366F1",
      "tags": ["algebra"],
      "noteCount": 2,
      "attachmentCount": 1,
      "createdAt": "…",
      "updatedAt": "…",
    },
  ],
}
```

**Current:** `src/actions/lessons.ts` → `lessonsActions.getAll(filters?)`. Fetches lesson rows, then
bulk-hydrates subjects, tags (via `lesson_tags`), note counts, and attachment counts into `Map`s
keyed by lesson id. Fallbacks when a subject is missing: `"Unknown subject"` / `#94a3b8`.

**Laravel:** `LessonController@index` → eager-load `subject`, `tags`, and
`withCount(['notes', 'attachments'])`. `LessonResource` flattens `subjectName`/`subjectColor` and
emits both `tagIds` and `tags` (names) — the frontend uses both.

#### GET /api/v1/lessons/{id} — `LESSON-002`

Single `LessonWithRelations`; `{"data": null}` if absent or not owned.

#### POST /api/v1/lessons — `LESSON-003`

```json
{
  "subjectId": "uuid",
  "title": "Quadratic equations",
  "date": "2026-08-24",
  "classOccurrenceId": null,
  "tagIds": ["uuid"]
}
```

| Field               | Rules                                                       |
| ------------------- | ----------------------------------------------------------- |
| `subjectId`         | required, uuid, **must belong to the caller**               |
| `title`             | required, `min:1`, `max:160`                                |
| `date`              | required, date `Y-m-d`                                      |
| `classOccurrenceId` | optional, uuid, must belong to the caller                   |
| `tagIds`            | optional, array of uuid, each **must belong to the caller** |

The `subjectId`/`tagIds` ownership checks are enforced today by RLS and by the
`enforce_lesson_tags_owner` trigger; in Laravel they become explicit `exists:…,user_id` rules.

Statuses are **not** accepted on create — they default to `not_started` / `not_reviewed` / `none`.

#### PATCH /api/v1/lessons/{id} — `LESSON-004`

Sparse. Accepts `subjectId`, `title`, `date`, `classOccurrenceId`, `tagIds`, plus `studyStatus`,
`reviewStatus`, `homeworkStatus`, `isArchived`.

**Tag semantics:** when `tagIds` is present it **replaces** the lesson's entire tag set — the
current `syncLessonTags()` deletes all `lesson_tags` rows for the lesson and re-inserts. Absent
`tagIds` leaves tags untouched.

#### POST /api/v1/lessons/{id}/duplicate — `LESSON-005`

Creates a new lesson copying `subject_id`, `class_occurrence_id`, `date`, and the tag set. Every
status resets to its default and `is_archived` is cleared. **Notes and attachments are not copied.**

The new title is the original with a hardcoded `" (Copy)"` suffix — English regardless of locale.
Reproduce as-is unless you intend to fix it (§21, `OQ-05`).

`201 {"data": null}`. **Current:** `lessons.mutations.ts` → `duplicateLesson()`.

#### POST /api/v1/lessons/{id}/archive — `LESSON-006`

**Toggles** `is_archived` — it does not set it. Read-modify-write today; in Laravel prefer an atomic
`UPDATE … SET is_archived = NOT is_archived`. Archiving does not touch notes or attachments.

Returns `404` `"Lesson not found."` when the row is absent or not owned.

#### DELETE /api/v1/lessons/{id} — `LESSON-007`

Hard delete. Cascades to `homework`, `exams`, `lesson_notes`, `attachments`, `flashcards`,
`lesson_tags`; **nulls** `study_sessions.lesson_id`. `204`.

#### PATCH /api/v1/lessons/{id}/reschedule — `LESSON-008`

`{"date": "2026-09-01"}` — required, date. Sets only `lessons.date`.

**Current:** `src/actions/calendar.mutations.ts` → `rescheduleLesson(lessonId, newDate)`. It lives
in the calendar domain because it backs month-view drag-and-drop, but it writes `lessons`.

---

### 7.6 Lesson Notes

Ownership: `user_id = auth.uid()` on all four commands. Note that notes carry **both** `lesson_id`
and a denormalized `user_id`, and RLS keys on `user_id`.

#### GET /api/v1/lessons/{lessonId}/notes — `NOTE-001`

```jsonc
{
  "data": [
    {
      "id": "uuid",
      "lessonId": "uuid",
      "userId": "uuid",
      "title": "Worked examples",
      "contentMarkdown": "## Example 1\n…",
      "createdAt": "…",
      "updatedAt": "…",
    },
  ],
}
```

Order: `created_at DESC`. **Current:** `src/actions/lesson-notes.ts` → `notesActions.getAllForLesson()`.

#### POST /api/v1/lessons/{lessonId}/notes — `NOTE-002`

```json
{ "title": "Worked examples", "contentMarkdown": "## Example 1" }
```

| Field             | Rules                                      |
| ----------------- | ------------------------------------------ |
| `title`           | required, `min:1`, `max:160` (DB CHECK)    |
| `contentMarkdown` | required, string; may be `""` (DB default) |

**Returns the created note** — `201 {"data": {…LessonNote}}`. This is one of the three bespoke
envelopes being normalized (§3.3); the UI inserts the returned note into local state, so the body
must carry it.

**Current:** `lesson-notes.mutations.ts` → `createNote()` → `CreateNoteResult`.

#### PATCH /api/v1/notes/{id} — `NOTE-003`

Sparse `title` / `contentMarkdown`. `lessonId` is **not** updatable.

#### DELETE /api/v1/notes/{id} — `NOTE-004`

`204`.

---

### 7.7 Attachments

This domain spans the database **and** object storage; see §14 for the storage contract.

#### GET /api/v1/lessons/{lessonId}/attachments — `ATTACH-001`

```jsonc
{
  "data": [
    {
      "id": "uuid",
      "lessonId": "uuid",
      "userId": "uuid",
      "kind": "pdf",
      "fileName": "chapter-3.pdf",
      "storagePath": "…/…/1756372800000-chapter-3.pdf",
      "publicUrl": "https://…/storage/v1/object/public/attachments/…",
      "sizeBytes": 184320,
      "mimeType": "application/pdf",
      "createdAt": "…",
      "updatedAt": "…",
    },
  ],
}
```

`publicUrl` is **derived at read time and never persisted** — the current code calls
`getPublicUrl(storage_path)` per row. In Laravel, generate it in the Resource
(`Storage::url()` or a temporary signed URL) so the column stays a path.

**Current:** `src/actions/attachments.ts` → `attachmentsActions.getAllForLesson()`.

#### POST /api/v1/lessons/{lessonId}/attachments — `ATTACH-002`

**Content type:** `multipart/form-data`, single `file` field.

| Rule         | Value                    | Source                                                |
| ------------ | ------------------------ | ----------------------------------------------------- |
| Max size     | 50 MB (`52428800` bytes) | bucket `file_size_limit`; `MAX_ATTACHMENT_SIZE_BYTES` |
| Allowed MIME | the 12 types below       | bucket `allowed_mime_types`; `ATTACHMENT_MIME_KIND`   |

`image/png`, `image/jpeg`, `image/webp`, `image/gif`, `application/pdf`, `video/mp4`, `video/webm`,
`video/quicktime`, `audio/mpeg`, `audio/mp4`, `audio/wav`, `audio/webm`.

`kind` is **derived server-side** from the MIME type (`image` | `pdf` | `video` | `audio`), never
supplied by the client. An unmapped MIME type is rejected with `"Unsupported file type."`

**Storage path convention:** `{userId}/{lessonId}/{timestamp}-{sanitizedFileName}`. The first
segment is load-bearing — Supabase's storage RLS derives ownership from it via
`(storage.foldername(name))[1]`. Laravel does not need the path for authorization, but keeping the
layout makes a data migration a straight file copy.

**Compensating rollback (must preserve):** the current implementation uploads the object first, then
inserts the row; **if the insert fails it deletes the just-uploaded object.** Without this, failed
uploads accumulate as orphaned files. In Laravel, wrap the row insert in a transaction and delete
the stored file in the `catch`.

`201 {"data": {…Attachment}}` — returns the created attachment (bespoke envelope today).

**Current:** `attachments.mutations.ts` → `uploadAttachment(lessonId, file)`.

**Note:** uploads go **through the server**, not browser-direct. `next.config.ts` raises the Server
Action body limit to 55 MB accordingly. Laravel needs a matching `upload_max_filesize` /
`post_max_size` and a `client_max_body_size` on the web server.

#### DELETE /api/v1/attachments/{id} — `ATTACH-003`

Reads `storage_path`, deletes the object, then deletes the row. `204`.
**Current:** `attachments.mutations.ts` → `deleteAttachment()`.

---

### 7.8 Tags

#### GET /api/v1/tags — `TAG-001`

`{"data": [{"id","userId","name","color","createdAt","updatedAt"}]}` — the caller's tags.

#### POST /api/v1/tags — `TAG-002`

```json
{ "name": "algebra" }
```

**Find-or-create, not create.** The current `createTag()` trims the name, looks for an existing tag
with `(user_id, name)`, and returns it if present — so picking an already-typed tag never creates a
duplicate or errors. Only on a miss does it insert.

**`color` is not accepted from the client.** It is derived server-side by `colorForTagName(name)` in
`src/lib/constants/tags.ts` — a deterministic name→hex mapping. Port that function; do not let
clients choose tag colors.

| Field  | Rules                                           |
| ------ | ----------------------------------------------- |
| `name` | required, trimmed, `min:1`, `max:40` (DB CHECK) |

`200 {"data": {…Tag}}` — returns the found-or-created tag, since the UI attaches it immediately.
Use `200` rather than `201` because the row may have already existed.

**Unique constraint:** `tags (user_id, name)`. The find-or-create makes `409` unreachable in
practice, but handle the race (concurrent identical inserts) by catching the unique violation and
re-reading.

**No update or delete endpoint exists** for tags. Removing a tag from a lesson is done through
`PATCH /lessons/{id}` with a new `tagIds` set; the `tags` row itself is never deleted by the UI.

---

### 7.9 Classes (the student's recurring weekly class)

> **Naming warning.** `classes` is the _student's own recurring weekly class_. It is a completely
> different entity from `teacher_classes` (§7.11), which is a teacher's roster-bearing class. The
> migration filenames are misleading — see §8.1.

A class recurs **indefinitely**: there is no start or end date. `isActive` pauses it. Each week it
produces `class_occurrence` rows, which is where attendance lives.

Ownership: `user_id = auth.uid()` on all four commands → `ClassPolicy` + owner scope.

#### GET /api/v1/classes — `CLASS-001`

Order: `created_at ASC`.

```jsonc
{
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "subjectId": "uuid",
      "teacher": "Dr. Hassan",
      "location": "Room 12",
      "meetings": [
        { "dayOfWeek": 1, "startTime": "16:00", "durationMinutes": 90 },
        { "dayOfWeek": 4, "startTime": "14:00", "durationMinutes": 120 },
      ],
      "isActive": true,
      "teacherClassId": null,
      "subjectName": "Mathematics",
      "subjectColor": "#6366F1",
      "subjectIcon": "calculator",
      "linkedTeacherClassName": null,
      "createdAt": "…",
      "updatedAt": "…",
    },
  ],
}
```

`dayOfWeek`: **0 = Sunday** … 6 = Saturday. This convention is centralized in
`src/lib/types/class.ts` and must not drift — Carbon's default differs from PHP's `date('w')` in
some configurations, so pin it explicitly.

**Current:** `src/actions/classes.ts` → `classesActions.getAll()`. Fetches classes, then two bulk
hydration queries (`subjects`, and `teacher_classes` for the optional link, skipped when no class
has one). Missing-subject fallbacks: `"Unknown subject"` / `#94a3b8` / `book-open`.

**Laravel:** eager-load `subject` and `teacherClass`; cast `meetings` to `array`.

#### GET /api/v1/classes/{id} — `CLASS-002`

Single `ClassWithSubject`; `{"data": null}` when absent or not owned.

#### POST /api/v1/classes — `CLASS-003`

```json
{
  "subjectId": "uuid",
  "teacher": "Dr. Hassan",
  "location": "Room 12",
  "meetings": [{ "dayOfWeek": 1, "startTime": "16:00", "durationMinutes": 90 }],
  "isActive": true,
  "teacherClassId": null
}
```

| Field                        | Rules                                                                |
| ---------------------------- | -------------------------------------------------------------------- | ------------------ |
| `subjectId`                  | required, uuid, must belong to caller                                |
| `teacher`                    | optional, trimmed, `max:120`                                         |
| `location`                   | optional, trimmed, `max:120`                                         |
| `meetings`                   | required, array, `min:1`                                             |
| `meetings.*.dayOfWeek`       | required, integer, `between:0,6`, **unique within the array**        |
| `meetings.*.startTime`       | required, `regex:/^([01]\d                                           | 2[0-3]):[0-5]\d$/` |
| `meetings.*.durationMinutes` | required, integer, `gt:0`                                            |
| `isActive`                   | optional, boolean, default `true`                                    |
| `teacherClassId`             | optional, uuid or `null`; caller must be **actively enrolled** in it |

The whole `meetings` rule set is enforced today by the `classes_meetings_valid` CHECK, which calls
`validate_class_meetings(jsonb)`. Port it as a Laravel custom rule; keep the DB check too.

`teacherClassId` is guarded by the `enforce_class_teacher_link` trigger — linking to a class you are
not enrolled in raises `42501`. In Laravel this becomes an `exists` rule plus a policy check.

**Side effect (must preserve):** after insert, `resetClassOccurrencesMaterializedAt()` clears
`settings.class_occurrences_materialized_at` so the very next read regenerates occurrences instead
of waiting out the 15-minute cooldown. Without it, a class created just after any page load shows no
occurrences — **including today's** — until the cooldown expires.

**Current:** `src/actions/classes.mutations.ts` → `createClass()`.

#### PATCH /api/v1/classes/{id} — `CLASS-004`

Sparse; same rules, all `sometimes`. An **empty patch short-circuits to success** without touching
the database — harmless to reproduce, and cheap.

**Two side effects, in order:**

1. `deleteFutureUntouchedOccurrences(classId)` — see below.
2. `resetClassOccurrencesMaterializedAt(userId)`.

#### POST /api/v1/classes/{id}/toggle-active — `CLASS-005`

Toggles `is_active`. `404 "Class not found."` when absent.
When toggling **from active to paused**, it also runs `deleteFutureUntouchedOccurrences`. It always
resets the materialization stamp.

#### DELETE /api/v1/classes/{id} — `CLASS-006`

Hard delete. `class_occurrences` cascade with it; `lessons.class_occurrence_id` is **nulled**, so
lessons survive. No occurrence cleanup call is needed — the cascade covers it. `204`.

---

### 7.10 Class Occurrences

Occurrences are **derived, never hand-created**. There is no create endpoint and no delete endpoint.
The only mutable state is attendance and exam status.

#### The materialization algorithm — `OCCUR-005`

This has no HTTP surface today; it runs as a side effect of read paths. Reproduce it precisely.

**Trigger:** every occurrence-reading path calls `ensureClassOccurrencesForUser(userId)` first.

**Throttle — compare-and-set, not read-then-write:**

```
cutoff = now - 15 minutes
1. read settings.class_occurrences_materialized_at; if newer than cutoff → return
2. UPDATE settings
     SET class_occurrences_materialized_at = now()
   WHERE user_id = ?
     AND (class_occurrences_materialized_at IS NULL
          OR class_occurrences_materialized_at < cutoff)
   RETURNING user_id
3. if no row returned → another request won the race → return
```

Step 2 is the claim. Two concurrent requests cannot both materialize.

**Generation:** for every `is_active` class, walk `today ± 30 days`; for each date whose weekday
matches a `meetings[].dayOfWeek`, emit one row:

```
user_id, subject_id, class_id, date,
start_time       ← copied from the meeting AT MATERIALIZATION TIME
duration_minutes ← copied from the meeting AT MATERIALIZATION TIME
attendance_status ← left NULL (never inherits last week's)
```

Insert with `ON CONFLICT (class_id, date) DO NOTHING` so re-runs never disturb recorded attendance.

The `start_time`/`duration_minutes` snapshot is deliberate: editing a class must not silently
rewrite the timing of occurrences that already happened.

**Timezone:** "today" is the user's local date, from `profiles.timezone`, falling back to UTC.

**Errors are swallowed** — this runs on read paths and must never fail a page render. Note the
stamp is set _before_ generation, so a failure delays the retry by one interval rather than
hot-looping.

**Purging on edit — `deleteFutureUntouchedOccurrences(classId)`:** deletes occurrences that are
`date >= today` **and** `attendance_status IS NULL` **and** `exam_status = 'none'` **and** have no
`lessons.class_occurrence_id` pointing at them. Anything the student has touched is never deleted.
Today is included, not just strictly-future dates, because the snapshotted fields would otherwise
show stale values until midnight. Strictly-past occurrences are never touched.

**Laravel:** a `ClassOccurrenceMaterializer` service invoked from a middleware or the controllers
that read occurrences. Use `updateOrInsert` with the unique `(class_id, date)` index and
`insertOrIgnore`.

#### GET /api/v1/class-occurrences — `OCCUR-001`

**Query parameters** (mirrors `ClassOccurrenceFilters`): `classId`, `subjectId`, `attendanceStatus`,
`examStatus`, `dateFrom`, `dateTo`. Order: `date ASC, start_time ASC`.

```jsonc
{
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "classId": "uuid",
      "subjectId": "uuid",
      "date": "2026-08-24",
      "startTime": "16:00",
      "durationMinutes": 90,
      "attendanceStatus": null,
      "examStatus": "none",
      "subjectName": "Mathematics",
      "subjectColor": "#6366F1",
      "subjectIcon": "calculator",
      "teacher": "Dr. Hassan",
      "location": "Room 12",
      "createdAt": "…",
      "updatedAt": "…",
    },
  ],
}
```

`teacher` and `location` are **not** columns on the occurrence — they are read through the join to
`classes`. `attendanceStatus` is `null` until recorded.

#### GET /api/v1/class-occurrences/{id} — `OCCUR-002`

Single occurrence, same shape.

#### GET /api/v1/class-occurrences/agenda — `OCCUR-003`

**Query:** `upcomingLimit` — optional integer, default **5**.

```jsonc
{
  "data": {
    "today": [
      /* occurrences */
    ],
    "upcoming": [
      /* ≤ limit */
    ],
  },
}
```

`today` uses the user's local date. Backs the dashboard's class card.

#### PATCH /api/v1/class-occurrences/{id} — `OCCUR-004`

```json
{ "attendanceStatus": "attended", "examStatus": "upcoming" }
```

| Field              | Rules                                                   |
| ------------------ | ------------------------------------------------------- |
| `attendanceStatus` | optional, nullable, `in:attended,absent,late,cancelled` |
| `examStatus`       | optional, `in:none,upcoming,completed`                  |

`attendanceStatus` is explicitly nullable — clearing it back to "unrecorded" is a valid operation.

**Downstream effect:** attendance feeds the `perfect-attendance` achievement, which is recomputed
over the **previous full calendar month** by `sync_user_achievements` (§9.1), and the
`attendanceRate` stat on subjects.

---

### 7.11 Calendar

#### GET /api/v1/calendar/{year}/{month} — `CAL-001`

**Path params:** `year` (integer), `month` (**1–12**, not zero-indexed).

```jsonc
{
  "data": {
    "year": 2026,
    "month": 8,
    "days": [
      {
        "date": "2026-08-01",
        "lessons": [
          /* LessonWithRelations */
        ],
        "classes": [
          /* ClassOccurrenceWithRelations */
        ],
      },
      // … one entry per day of the month
    ],
  },
}
```

One entry per calendar day, including empty days — the month grid renders from this array directly.

**Current:** `src/actions/calendar.ts` → `calendarActions.getMonth(year, month)`. Fetches lessons and
occurrences for the month range and buckets them by date in TypeScript.

**Laravel:** `CalendarController@month`. Fetch both collections with a single range query each and
group by date; do not query per day.

The only calendar mutation is `LESSON-008` (reschedule), documented under Lessons.

---

### 7.12 Teacher Classes

> A `teacher_classes` row is a teacher's roster-bearing class. `subject_label` is **free text**, not
> a foreign key to `subjects` — a teacher has no `subjects` rows of their own.

Every endpoint here requires `role = teacher`, enforced today by `requireRole(supabase, "teacher")`
→ `"You do not have access to this action."` In Laravel: an `EnsureRole:teacher` middleware on the
route group, returning `403`.

#### GET /api/v1/teaching/classes — `TCLASS-001`

```jsonc
{
  "data": [
    {
      "id": "uuid",
      "teacherId": "uuid",
      "name": "Grade 10 Physics",
      "subjectLabel": "Physics",
      "description": null,
      "isArchived": false,
      "joinCode": "K7M2QX",
      "studentCount": 23,
      "createdAt": "…",
      "updatedAt": "…",
    },
  ],
}
```

**`joinCode` comes from a separate table on purpose.** `class_join_codes` exists as its own table
because Postgres has no column-level RLS: enrolled students can read `teacher_classes` (they need
the name), so the code had to live somewhere students cannot select from. **The Laravel port must
keep the code out of any student-visible payload** — put it on a Resource used only by teacher
routes, never on a shared one.

`studentCount` counts enrollments with `status = 'active'` only.

**RLS translation** — `"Teachers and their enrolled students can view a class"`:

```
USING: teacher_id = (select auth.uid()) OR public.is_enrolled_in_class(id)

Laravel: TeacherClassPolicy::view(User $u, TeacherClass $c)
             => $c->teacher_id === $u->id
             || $c->enrollments()->where('student_id',$u->id)->where('status','active')->exists()
```

#### GET /api/v1/teaching/classes/{id} — `TCLASS-002`

Single `TeacherClassWithStats`.

#### GET /api/v1/teaching/classes/{id}/roster — `TCLASS-003`

```jsonc
{
  "data": [
    {
      "studentId": "uuid",
      "fullName": "Sara Ahmed",
      "avatarUrl": null,
      "status": "active",
      "joinedAt": "2026-08-10T12:00:00Z",
    },
  ],
}
```

Includes `removed` students, so the teacher can see who left.

**How the teacher can read student names at all:** a dedicated policy on `profiles`,
`"Users can view profiles they share a class with"`, `USING shares_teacher_class_with(id)`. That
helper is true when the caller teaches a class the target is actively enrolled in, **or** the caller
is actively enrolled in a class the target teaches. It is deliberately **not transitive** — two
students in the same class cannot see each other.

```
Laravel: ProfilePolicy::view(User $u, Profile $p)
             => $p->id === $u->id || $u->sharesTeacherClassWith($p->id)
```

This is the **only** cross-user data visibility in the entire application. A teacher can see a
student's `full_name` and `avatar_url`, plus whatever that student submitted to the teacher's own
assignments — and nothing else. No policy anywhere grants a teacher access to a student's lessons,
notes, subjects, grades, study sessions, or attachments.

#### POST /api/v1/teaching/classes — `TCLASS-004`

```json
{
  "name": "Grade 10 Physics",
  "subjectLabel": "Physics",
  "description": "Mechanics unit"
}
```

| Field          | Rules                                   |
| -------------- | --------------------------------------- |
| `name`         | required, `min:1`, `max:120` (DB CHECK) |
| `subjectLabel` | optional, nullable, string              |
| `description`  | optional, nullable, string              |

**Transactional requirement.** This is not a plain insert — it calls the `create_teacher_class` RPC,
which inserts the class **and** its join code in one transaction, so **a class never exists without
a code**. Code generation retries once on a unique violation.

`201 {"data": null}`. Errors: `403` when the caller is not a teacher (the RPC re-checks
`current_app_role() = 'teacher'` independently of the application guard).

**Laravel:**

```
TeacherClassController@store
  ↓ StoreTeacherClassRequest
  ↓ EnsureRole:teacher  (+ re-check in the service — defense in depth, as today)
  ↓ TeacherClassService::create()      ← DB::transaction { class + join code }
  ↓ TeacherClass::create() + JoinCode::create()
```

**Join-code generation** — port `generate_join_code()` exactly:

- 6 characters from the alphabet `ABCDEFGHJKMNPQRSTUVWXYZ23456789`
- **`I`, `L`, `O`, `0`, `1` are excluded** to avoid transcription errors (~887M combinations)
- up to 10 attempts, checking uniqueness; callers additionally retry once on a unique violation
  because check-then-insert is not atomic

#### PATCH /api/v1/teaching/classes/{id} — `TCLASS-005`

Sparse `name`, `subjectLabel`, `description`, `isArchived`.

#### POST /api/v1/teaching/classes/{id}/archive — `TCLASS-006`

Toggles `is_archived` (soft delete).

#### DELETE /api/v1/teaching/classes/{id} — `TCLASS-007`

Hard delete. Cascades to `class_join_codes`, `class_enrollments`, `assignments`, and through those
to `assignment_submissions`. **This destroys students' submitted work** — which is precisely why
`USER-003` refuses to delete a teacher account that still owns classes. `204`.

#### POST /api/v1/teaching/classes/{id}/rotate-code — `TCLASS-008`

Generates a new code, invalidating the old one. Existing enrollments are unaffected.

**Response** `200 {"data": "P4X9RT"}` — returns the new code.

**Current:** `rotateJoinCode()` → `rpc("rotate_join_code", {p_class_id})`. The RPC re-checks
`is_teacher_of_class(p_class_id)` and raises `42501` otherwise.

---

### 7.13 Enrollments

#### GET /api/v1/classroom/classes — `ENROLL-001`

Student-only. The classes the caller has joined.

```jsonc
{
  "data": [
    {
      "teacherClassId": "uuid",
      "name": "Grade 10 Physics",
      "subjectLabel": "Physics",
      "teacherName": "Mr. Khaled",
      "status": "active",
      "joinedAt": "2026-08-10T12:00:00Z",
    },
  ],
}
```

**No `joinCode` field** — students must never receive it.

#### POST /api/v1/classroom/classes/join — `ENROLL-002`

```json
{ "code": "K7M2QX" }
```

| Field  | Rules                                                  |
| ------ | ------------------------------------------------------ |
| `code` | required, trimmed, uppercased, `regex:/^[A-Z0-9]{6}$/` |

**Server-side normalization (must reproduce):** the RPC applies
`upper(regexp_replace(p_code, '[^A-Za-z0-9]', '', 'g'))` before lookup, so `k7m-2qx` and `K7M2QX`
are the same code. Do not rely on the client having normalized it.

**Response** `200 {"data": "uuid-of-the-class"}` — the joined class's id, which the UI uses to
navigate.

**Errors:**

- `422` malformed code
- `403` caller is not a student (`current_app_role() <> 'student'`)
- `404 {"message": "invalid_join_code"}` — unknown code. Keep this **exact sentinel string**; the UI
  maps it to a translated message. The RPC raises it as SQLSTATE `P0001`.

**Idempotency:** joining is an upsert —
`ON CONFLICT (teacher_class_id, student_id) DO UPDATE SET status = 'active'`. A student who left and
re-joins is reactivated rather than duplicated, and re-joining while already active is a no-op.

**Current:** `src/actions/enrollments.mutations.ts` → `joinClass()` → `rpc("join_class_by_code")`.

#### POST /api/v1/classroom/classes/{id}/leave — `ENROLL-003`

Student-only. **Never deletes** — sets `status = 'removed'` so historical submissions survive.

`200 {"data": null}`. Errors: `404` `"not enrolled in this class"` (SQLSTATE `P0002`).

#### DELETE /api/v1/teaching/classes/{id}/roster/{studentId} — `ENROLL-004`

Teacher-only. Also a soft removal — sets `status = 'removed'`. `204`.

**Current:** `removeStudent(classId, studentId)`. Unlike join/leave this is a **plain update, not an
RPC**, because the `class_enrollments` UPDATE policy already scopes it to the owning teacher:

```
USING / WITH CHECK: public.is_teacher_of_class(teacher_class_id)

Laravel: EnrollmentPolicy::update(User $u, Enrollment $e)
             => $e->teacherClass->teacher_id === $u->id
```

**Write-path note:** `class_enrollments` has **no INSERT and no DELETE policy at all**. Rows can only
be created by `join_class_by_code()` and can never be deleted through the API — only status-flipped.
Additionally, `enforce_enrollment_pin` rejects any update that changes `teacher_class_id` or
`student_id` (`42501`). Reproduce all three constraints.

---

### 7.14 Assignments

Teacher-owned; students see only published ones for classes they are actively enrolled in.

**The core RLS rule** — `"Teachers see their own assignments, students see published ones"`:

```
USING: public.is_teacher_of_class(teacher_class_id)
       OR (status = 'published' AND public.is_enrolled_in_class(teacher_class_id))

Laravel: AssignmentPolicy::view(User $u, Assignment $a)
    => $a->teacherClass->teacher_id === $u->id
    || ($a->status === 'published' && $u->isActivelyEnrolledIn($a->teacher_class_id));

  + scope for student lists:
      Assignment::where('status','published')
                ->whereIn('teacher_class_id', $u->activeEnrollmentClassIds())
```

A draft assignment is **invisible** to students, not forbidden — unpublishing hides it again.

#### GET /api/v1/teaching/assignments — `ASSIGN-001`

Teacher view — all of the caller's assignments, drafts included.

```jsonc
{
  "data": [
    {
      "id": "uuid",
      "teacherClassId": "uuid",
      "teacherId": "uuid",
      "title": "Problem set 3",
      "instructions": "Questions 1–12",
      "dueAt": "2026-09-01T21:00:00Z",
      "totalPoints": 100,
      "status": "published",
      "publishedAt": "2026-08-25T08:00:00Z",
      "className": "Grade 10 Physics",
      "createdAt": "…",
      "updatedAt": "…",
    },
  ],
}
```

Note `dueAt` is a **timestamptz**, not a date.

#### GET /api/v1/classroom/assignments — `ASSIGN-002`

Student view — published assignments for actively-enrolled classes only.

```jsonc
{
  "data": [
    {
      "id": "uuid",
      "teacherClassId": "uuid",
      "title": "Problem set 3",
      "instructions": "Questions 1–12",
      "dueAt": "2026-09-01T21:00:00Z",
      "totalPoints": 100,
      "status": "published",
      "publishedAt": "…",
      "className": "Grade 10 Physics",
      "teacherName": "Mr. Khaled",
    },
  ],
}
```

`teacherId`, `createdAt`, and `updatedAt` are **deliberately absent** from the student shape.

#### GET /api/v1/assignments/{id} — `ASSIGN-003`

Returns the `AssignmentForStudent` shape. Visibility follows the policy above, so a teacher may also
call it. `{"data": null}` when not visible — do **not** return `403` (§4.3).

#### POST /api/v1/teaching/assignments — `ASSIGN-004`

```json
{
  "teacherClassId": "uuid",
  "title": "Problem set 3",
  "instructions": "Questions 1–12",
  "dueAt": "2026-09-01T21:00:00Z",
  "totalPoints": 100
}
```

| Field            | Rules                                 | Source                              |
| ---------------- | ------------------------------------- | ----------------------------------- |
| `teacherClassId` | required, uuid, caller must teach it  | Zod + RLS                           |
| `title`          | required, trimmed, `min:1`, `max:160` | Zod + DB CHECK                      |
| `instructions`   | optional, trimmed, `max:5000`         | Zod + DB CHECK                      |
| `dueAt`          | required, ISO datetime                | Zod                                 |
| `totalPoints`    | required, numeric, `gt:0`, `max:1000` | Zod (`max:1000`) + DB CHECK (`> 0`) |

Note the mismatch: the DB only enforces `> 0`; the `max:1000` ceiling exists **only** in the Zod
form schema and is therefore unenforced today. Decide deliberately whether to enforce it server-side
(recommended) — see `OQ-04`.

Created as `status = 'draft'`, `published_at = null`. `201`.

#### PATCH /api/v1/teaching/assignments/{id} — `ASSIGN-005`

Sparse `title`, `instructions`, `dueAt`, `totalPoints`.

**`teacherClassId` is immutable** — it is excluded from `UpdateAssignmentInput` at the type level and
the `enforce_assignment_pin` trigger rejects any change to `teacher_class_id` or `teacher_id` with
`42501`. Reject it in the FormRequest (`prohibited`) _and_ keep a DB-level guard.

#### POST /api/v1/teaching/assignments/{id}/publish — `ASSIGN-006`

Sets `status = 'published'`, `published_at = now()`, then **fans out notifications**.

`200 {"data": null}`.

**Notification fan-out (critical):** the current code calls `rpc("notify_assignment_published")`
**best-effort** — an RPC failure is only `console.error`ed and never surfaced to the teacher. The
publish succeeds regardless. Reproduce that isolation: dispatch the notification job **after
commit** and do not let it fail the request.

The RPC itself (`SECURITY DEFINER`) does **not** trust the caller — it re-derives authorization from
the row: the assignment must have `teacher_id = auth.uid()` AND `status = 'published'`, else `42501`.
It then inserts one `assignment_assigned` notification per **actively enrolled** student whose
preferences allow that type (`coalesce(…, true)` — missing key means enabled).

**Dedupe key: `assignment_assigned:<assignment_id>` — deliberately without a date component**, so
publish → unpublish → republish **never re-notifies**. This is intentional, not a bug.

**These notifications send no email.** They are written directly in SQL, bypassing the TypeScript
email path entirely. Only the generated types (`upcoming_lesson`, `homework_due`, etc.) can be
emailed.

#### POST /api/v1/teaching/assignments/{id}/unpublish — `ASSIGN-007`

Sets `status = 'draft'`, `published_at = null`. **No notification.** Students immediately lose
visibility. Existing submissions are retained.

#### DELETE /api/v1/teaching/assignments/{id} — `ASSIGN-008`

Hard delete; cascades to `assignment_submissions`. `204`.

---

### 7.15 Submissions

The most authorization-sensitive domain in the application. Column-level write scoping here is
enforced by a **database trigger**, not by RLS, and is easy to lose in a port.

#### The write-scope rule — `enforce_submission_write_scope()`

Runs `BEFORE UPDATE` on `assignment_submissions`:

1. If `assignment_id` or `student_id` changed → raise `42501`.
2. **Student branch** (`auth.uid() = old.student_id`):
   - if `old.graded_at IS NOT NULL` → raise "a graded submission can no longer be edited" (`42501`)
   - if any of `score`, `feedback`, `graded_at`, `graded_by` changed → raise "students cannot set
     score, feedback, or grading fields" (`42501`)
3. **Teacher branch** (otherwise):
   - if `content` or `submitted_at` changed → raise "teachers cannot edit submission content"
     (`42501`)
   - look up `assignments.total_points`; if `new.score > total_points` → raise `23514`
   - **force** `new.graded_by := auth.uid()` and `new.graded_at := now()`

The RLS UPDATE policy is deliberately broad (`student_id = auth.uid() OR is_teacher_of_assignment(…)`)
precisely because the trigger does the fine-grained work.

**Laravel translation:** split it across two dedicated endpoints (`SUBMIT-003` for students,
`SUBMIT-004` for teachers), each with a FormRequest that only accepts its own fields, plus a model
observer or service that stamps `graded_by`/`graded_at` server-side. **Never accept `score`,
`gradedAt`, or `gradedBy` from a student payload, and never accept `content` from a teacher payload.**
Keep the DB trigger as a backstop.

#### GET /api/v1/teaching/assignments/{id}/submissions — `SUBMIT-001`

Teacher-only. The grading queue.

```jsonc
{
  "data": [
    {
      "studentId": "uuid",
      "fullName": "Sara Ahmed",
      "avatarUrl": null,
      "status": "submitted",
      "submission": {
        "id": "uuid",
        "assignmentId": "uuid",
        "studentId": "uuid",
        "content": "…",
        "submittedAt": "…",
        "score": null,
        "feedback": null,
        "gradedAt": null,
        "gradedBy": null,
        "createdAt": "…",
        "updatedAt": "…",
      },
    },
  ],
}
```

**Every actively enrolled student appears**, even without a submission — a student who has not turned
work in has `"status": "assigned"` and `"submission": null`. The queue must show who is missing, so
this is a left join from the roster, not a list of submissions.

**`status` is derived, never stored:**

| Condition                       | Status      |
| ------------------------------- | ----------- |
| no submission row               | `assigned`  |
| row exists, `graded_at IS NULL` | `submitted` |
| `graded_at IS NOT NULL`         | `graded`    |

#### GET /api/v1/classroom/assignments/{id}/submission — `SUBMIT-002`

The student's own submission, or `{"data": null}` if they have not submitted.

```jsonc
{
  "data": {
    "id": "uuid",
    "assignmentId": "uuid",
    "studentId": "uuid",
    "content": "…",
    "submittedAt": "…",
    "score": 87,
    "feedback": "Good work on Q7.",
    "gradedAt": "…",
    "gradedBy": "uuid",
    "status": "graded",
    "createdAt": "…",
    "updatedAt": "…",
  },
}
```

#### PUT /api/v1/classroom/assignments/{id}/submission — `SUBMIT-003`

**`PUT`, not `POST`** — this is an upsert on `(assignment_id, student_id)`. Resubmitting updates the
same row rather than creating a second one.

```json
{ "content": "My answers…" }
```

| Field     | Rules                                     |
| --------- | ----------------------------------------- |
| `content` | required, `min:1`, `max:20000` (DB CHECK) |

`submitted_at` is set to `now()` server-side on every submit.

**Errors:**

- `403` caller is not a student
- `403` the assignment is not published, or the student is not actively enrolled — enforced by the
  `can_submit_assignment(assignment_id)` RLS predicate on INSERT:
  ```
  EXISTS (SELECT 1 FROM assignments a
          WHERE a.id = ? AND a.status = 'published'
            AND public.is_enrolled_in_class(a.teacher_class_id))
  ```
- `403` the submission is already graded — resubmission is blocked once `graded_at` is set

**Note there is no due-date enforcement.** `due_at` is displayed but never checked; late submissions
are accepted. Preserve this unless the product decides otherwise (`OQ-06`).

**Current:** `src/actions/submissions.mutations.ts` → `submitAssignment()`. It passes **no ownership
predicate** in the query — authorization rests entirely on the RLS insert policy and the trigger.

#### PATCH /api/v1/teaching/submissions/{id}/grade — `SUBMIT-004`

```json
{ "score": 87, "feedback": "Good work on Q7." }
```

| Field      | Rules                                                        |
| ---------- | ------------------------------------------------------------ |
| `score`    | required, numeric, `min:0`, **`<= assignment.total_points`** |
| `feedback` | optional, nullable, `max:5000` (DB CHECK)                    |

The `score <= total_points` check is **cross-table** and is enforced today only inside the trigger
(raising `23514`). In Laravel implement it as a FormRequest rule that loads the assignment.

`graded_by` and `graded_at` are **server-stamped** and must be rejected if present in the payload.

**Regrading is allowed** — a second call updates the row and, because the dedupe key includes
`graded_at`, sends a fresh notification.

**Notification:** best-effort `rpc("notify_submission_graded")`, same isolation as publish. The RPC
re-derives authorization (the submission's assignment must have `teacher_id = auth.uid()` and
`graded_at IS NOT NULL`) and notifies the student, honoring their `assignment_graded` preference.
Dedupe key `assignment_graded:<submission_id>:<graded_at>` — a genuine regrade re-notifies, a no-op
update does not. No email.

**Current:** `gradeSubmission()` filters **only** `.eq("id", submissionId)` — no teacher-ownership
predicate at all. That is safe today purely because RLS and the trigger cover it. **A Laravel port
without an explicit policy check here would let any teacher grade any submission.** This is the
single most dangerous line to port naively.

```
SubmissionController@grade
  ↓ EnsureRole:teacher
  ↓ GradeSubmissionRequest        score, feedback only
  ↓ SubmissionPolicy::grade()     $submission->assignment->teacher_id === $u->id   ← REQUIRED
  ↓ GradingService::grade()       stamps graded_by/graded_at, validates score
  ↓ dispatch(NotifySubmissionGraded) after commit, failures swallowed
```

**Delete policy:** `"Students can delete their own ungraded submission"` —
`USING student_id = auth.uid() AND graded_at IS NULL`. No endpoint exposes this today, but the
policy exists; do not grant broader delete rights in the port.

---

### 7.16 Homework

> Not to be confused with `assignments`. `homework` is the student's **own private** to-do attached
> to a lesson; `assignments` are set by a teacher. They share no tables and no code.

Ownership: `user_id = auth.uid()` on all four commands.

#### GET /api/v1/homework — `HW-001`

Order: `deadline ASC`.

```jsonc
{
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "lessonId": "uuid",
      "subjectId": "uuid",
      "title": "Exercises 4.1–4.8",
      "deadline": "2026-08-30",
      "completed": false,
      "subjectName": "Mathematics",
      "subjectColor": "#6366F1",
      "lessonTitle": "Quadratic equations",
      "createdAt": "…",
      "updatedAt": "…",
    },
  ],
}
```

#### POST /api/v1/homework — `HW-002`

```json
{ "lessonId": "uuid", "title": "Exercises 4.1–4.8", "deadline": "2026-08-30" }
```

| Field      | Rules                                   |
| ---------- | --------------------------------------- |
| `lessonId` | required, uuid, must belong to caller   |
| `title`    | required, `min:1`, `max:160` (DB CHECK) |
| `deadline` | required, date `Y-m-d`                  |

**`subjectId` is not accepted** — it is derived server-side from the lesson. The column is
denormalized onto `homework` for query performance, and the current action looks it up from the
lesson before inserting. Do not let the client set it.

#### PATCH /api/v1/homework/{id} — `HW-003`

Sparse `lessonId`, `title`, `deadline`, `completed`. Changing `lessonId` must re-derive `subjectId`.

#### PATCH /api/v1/homework/{id}/completed — `HW-004`

```json
{ "completed": true }
```

**Sets, not toggles** — unlike the lesson/class archive endpoints, the caller supplies the value.

**Downstream effect:** completed homework feeds XP (`XP_PER_COMPLETED_HOMEWORK = 8`) and the
`homeworkProgress` subject stat.

#### DELETE /api/v1/homework/{id} — `HW-005`

`204`.

---

### 7.17 Exams

Ownership: `user_id = auth.uid()`.

#### GET /api/v1/exams — `EXAM-001`

Order: `date DESC`.

```jsonc
{
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "lessonId": "uuid",
      "subjectId": "uuid",
      "title": "Midterm",
      "date": "2026-08-20",
      "score": 87,
      "totalScore": 100,
      "percentage": 87,
      "subjectName": "Mathematics",
      "subjectColor": "#6366F1",
      "lessonTitle": "Quadratic equations",
      "createdAt": "…",
      "updatedAt": "…",
    },
  ],
}
```

**`percentage` is a generated column**, `numeric(5,2)`, computed as
`round((score / total_score) * 100, 2)` and `NULL` while `score` is null. Recreate it as a Postgres
generated column in Laravel's migration — do not compute it in PHP, because `grades` queries filter
and average on it directly.

#### POST /api/v1/exams — `EXAM-002`

```json
{
  "lessonId": "uuid",
  "title": "Midterm",
  "date": "2026-08-20",
  "totalScore": 100,
  "score": 87
}
```

| Field        | Rules                                            |
| ------------ | ------------------------------------------------ |
| `lessonId`   | required, uuid, must belong to caller            |
| `title`      | required, `min:1`, `max:160`                     |
| `date`       | required, date                                   |
| `totalScore` | required, numeric, `gt:0`                        |
| `score`      | optional, numeric, `min:0`, **`lte:totalScore`** |

`subjectId` is derived from the lesson, as with homework.

The `score <= totalScore` rule exists in both the Zod schema (as a `.refine()`) and the DB CHECK
`exams_score_within_total`. An exam with no `score` is an _upcoming_ exam.

#### PATCH /api/v1/exams/{id} — `EXAM-003`

Sparse; same rules.

#### PATCH /api/v1/exams/{id}/score — `EXAM-004`

```json
{ "score": 87 }
```

A dedicated endpoint because the exams list has an inline "record score" control.
`score` required, numeric, `min:0`, `lte` the exam's stored `totalScore`.

**Downstream:** a scored exam grants `XP_PER_SCORED_EXAM = 15`, plus `XP_BONUS_EXAM_ACE = 10` when
`percentage >= 90`, and can unlock the `exam-ace` achievement.

#### DELETE /api/v1/exams/{id} — `EXAM-005`

`204`.

---

### 7.18 Flashcards

Spaced repetition using **SM-2 (SuperMemo 1987)**. The scheduling state lives on the card;
`flashcard_reviews` is an append-only log.

#### GET /api/v1/lessons/{lessonId}/flashcards — `FLASH-001`

```jsonc
{
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "lessonId": "uuid",
      "subjectId": "uuid",
      "front": "What is the discriminant?",
      "back": "b² − 4ac",
      "easeFactor": 2.5,
      "intervalDays": 6,
      "repetitions": 2,
      "dueDate": "2026-08-30",
      "lastReviewedAt": "2026-08-24T18:00:00Z",
      "subjectName": "Mathematics",
      "subjectColor": "#6366F1",
      "lessonTitle": "Quadratic equations",
      "createdAt": "…",
      "updatedAt": "…",
    },
  ],
}
```

#### GET /api/v1/flashcards/decks — `FLASH-002`

Per-subject rollup for the deck browser.

```jsonc
{
  "data": [
    {
      "subjectId": "uuid",
      "subjectName": "Mathematics",
      "subjectColor": "#6366F1",
      "totalCards": 42,
      "dueCount": 7,
    },
  ],
}
```

`dueCount` counts cards with `due_date <= today`.

#### GET /api/v1/flashcards/due — `FLASH-003`

**Query:** `subjectId` (optional), `lessonId` (optional). Cards with `due_date <= today`, ordered
`due_date ASC`.

#### POST /api/v1/flashcards — `FLASH-004`

```json
{ "lessonId": "uuid", "front": "What is the discriminant?", "back": "b² − 4ac" }
```

| Field      | Rules                                  |
| ---------- | -------------------------------------- |
| `lessonId` | required, uuid, must belong to caller  |
| `front`    | required, trimmed, `min:1`, `max:500`  |
| `back`     | required, trimmed, `min:1`, `max:1000` |

`subjectId` is derived from the lesson. SM-2 state initializes to
`easeFactor 2.5`, `intervalDays 0`, `repetitions 0`, `dueDate = current_date` — i.e. a new card is
immediately due.

The length limits come from the Zod schema only; there are **no DB CHECK constraints** on `front` or
`back`.

#### PATCH /api/v1/flashcards/{id} — `FLASH-005`

Sparse `front` / `back` **only**. SM-2 state is never client-editable.

#### DELETE /api/v1/flashcards/{id} — `FLASH-006`

`204`. Cascades to that card's `flashcard_reviews`.

#### POST /api/v1/flashcards/{id}/reviews — `FLASH-007`

```json
{ "grade": "good" }
```

| Field   | Rules                               |
| ------- | ----------------------------------- |
| `grade` | required, `in:again,hard,good,easy` |

**Two writes in one operation:** insert a `flashcard_reviews` row and update the card's SM-2 state.
Wrap in a transaction.

**Grade → SM-2 quality mapping** (the UI offers 4 buttons, SM-2 uses 0–5):

| Grade   | Quality |
| ------- | ------- |
| `again` | 0       |
| `hard`  | 3       |
| `good`  | 4       |
| `easy`  | 5       |

**The algorithm** — port `applySm2()` from `src/lib/flashcards/sm2.ts` exactly:

```
if quality < 3:
    repetitions   = 0
    intervalDays  = 1
else:
    repetitions   = repetitions + 1
    intervalDays  = 1                                if repetitions == 1
                  = 6                                if repetitions == 2
                  = round(intervalDays * easeFactor) otherwise

easeFactor = max(1.3, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)))
easeFactor = round(easeFactor, 2)
dueDate    = today + intervalDays days
```

`flashcard_reviews.quality` stores the numeric 0–5 value (DB CHECK `between 0 and 5`), not the grade
string. `lastReviewedAt` is set to `now()`.

**`flashcard_reviews` is append-only** — it has SELECT and INSERT policies only, no UPDATE or DELETE,
and no `updated_at` column or trigger. Preserve that; the review log is audit data.

**Downstream:** each review grants `XP_PER_FLASHCARD_REVIEW = 2`.

---

### 7.19 Grades

#### GET /api/v1/grades/overview — `GRADE-001`

Read-only aggregate. No mutations exist in this domain — the grade _scale_ is edited through
`SET-003`.

```jsonc
{
  "data": {
    "subjects": [
      {
        "subjectId": "uuid",
        "subjectName": "Mathematics",
        "subjectColor": "#6366F1",
        "creditHours": 3,
        "examCount": 4,
        "average": 86.5,
        "letter": "B",
        "gradePoints": 3,
      },
    ],
    "gpa": 3.42,
    "trend": [{ "label": "Mar", "value": 81.2 }],
  },
}
```

**Computation, to reproduce exactly** (`src/actions/grades.ts` + `src/lib/grades/scale.ts`):

1. `average` — the mean of `exams.percentage` across the subject's **scored** exams. `null` when the
   subject has no scored exams.
2. `letter` / `gradePoints` — `percentageToGrade(average, scale)`. The scale is **sorted by
   `minPercent` descending** and the first entry with `average >= minPercent` wins, so scale entries
   need not be pre-sorted in storage.
3. `gpa` — credit-weighted:
   ```
   graded      = subjects where average is not null
   totalCredits = Σ creditHours over graded
   totalPoints  = Σ (gradePoints × creditHours) over graded
   gpa          = round(totalPoints / totalCredits, 2)
   ```
   **Subjects with no scored exams are excluded from the denominator**, not counted as zero.
   `gpa` is `null` when nothing is graded or total credits are zero.
4. `trend` — average exam percentage per month for the **last 6 months**.

**Defensive scale parsing:** `parseGradeScale()` validates every entry's shape and falls back to
`DEFAULT_GRADE_SCALE` if the stored jsonb is malformed or empty. The Laravel port must do the same —
a bad scale must never break the grades page.

---

### 7.20 Study Sessions

A session is either **running** (`ended_at IS NULL`) or finished. `duration_minutes` is a
**generated column**:

```sql
CASE WHEN ended_at IS NOT NULL
     THEN ceil(extract(epoch FROM (ended_at - started_at)) / 60)::integer
     ELSE NULL END
```

Note `ceil`, not `round`. Recreate as a generated column; statistics and XP read it directly.

`subject_id` and `lesson_id` are both **nullable** and both `ON DELETE SET NULL` — logged study time
survives deletion of the thing it was about.

#### GET /api/v1/study-sessions — `SESSION-001`

Order: `started_at DESC`. Full history, unbounded.

```jsonc
{
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "subjectId": "uuid",
      "lessonId": null,
      "startedAt": "2026-08-24T16:00:00Z",
      "endedAt": "2026-08-24T17:30:00Z",
      "durationMinutes": 90,
      "subjectName": "Mathematics",
      "subjectColor": "#6366F1",
      "lessonTitle": null,
      "createdAt": "…",
      "updatedAt": "…",
    },
  ],
}
```

#### GET /api/v1/study-sessions/running — `SESSION-002`

The caller's single in-progress session, or `{"data": null}`.
Backed by the partial index `idx_study_sessions_running (user_id) WHERE ended_at IS NULL`.

**Note:** nothing enforces _one_ running session per user — there is no unique constraint. The UI
prevents it, but the API does not. Consider adding a partial unique index (`OQ-07`).

#### GET /api/v1/study-sessions/summary — `SESSION-003`

```jsonc
{
  "data": {
    "totalMinutesThisWeek": 420,
    "totalMinutesToday": 90,
    "averageSessionMinutes": 52,
    "sessionsThisWeek": 8,
  },
}
```

#### POST /api/v1/study-sessions — `SESSION-004`

Starts a timer.

```json
{ "subjectId": "uuid", "lessonId": null }
```

Both optional and nullable. `started_at` defaults to `now()`; `ended_at` stays null. `201`.

#### POST /api/v1/study-sessions/{id}/stop — `SESSION-005`

Sets `ended_at = now()`. `duration_minutes` computes itself. `200 {"data": null}`.

#### POST /api/v1/study-sessions/{id}/cancel — `SESSION-006`

**Deletes** the running row rather than ending it — a cancelled session leaves no trace and
contributes no study time. `200`.

#### POST /api/v1/study-sessions/manual — `SESSION-007`

Logs time already studied.

```json
{
  "subjectId": "uuid",
  "lessonId": null,
  "startedAt": "2026-08-23T14:00:00Z",
  "durationMinutes": 45
}
```

| Field             | Rules                                           |
| ----------------- | ----------------------------------------------- |
| `subjectId`       | optional, nullable, uuid, must belong to caller |
| `lessonId`        | optional, nullable, uuid, must belong to caller |
| `startedAt`       | required, ISO datetime                          |
| `durationMinutes` | required, integer, `gt:0`                       |

**`ended_at` is computed server-side** as `startedAt + durationMinutes`, because `duration_minutes`
is generated and cannot be written directly. The DB CHECK `ended_at >= started_at` backstops it.

#### PATCH /api/v1/study-sessions/{id} — `SESSION-008`

Edits a logged session; same fields as manual logging, re-deriving `ended_at`.
**Not exported through the `Actions` barrel** today — imported directly by
`modules/study-sessions/components/LogSessionDialog.tsx`.

#### DELETE /api/v1/study-sessions/{id} — `SESSION-009`

`204`.

---

### 7.21 Notifications

The most intricate domain. Full generation semantics are in §15; this section covers the HTTP
surface.

Seven types: `upcoming_lesson`, `homework_due`, `daily_reminder`, `upcoming_class`,
`review_reminder`, `assignment_assigned`, `assignment_graded`.

#### GET /api/v1/notifications — `NOTIF-001`

The notification center. **Limit 50**, `created_at DESC`.

```jsonc
{
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "type": "homework_due",
      "title": "واجب مستحق قريبًا",
      "body": "Exercises 4.1–4.8 — due tomorrow",
      "readAt": null,
      "linkPath": "/homework/list",
      "createdAt": "…",
      "updatedAt": "…",
    },
  ],
}
```

**`title` and `body` are stored, already-localized strings**, not i18n keys. They are written at
generation time in the user's `settings.locale` because generation happens outside any request's
locale scope (cron, or a DB function). Do not attempt to translate them at read time.

**Defensive mapping:** `mapNotificationRow()` degrades an unrecognized `type` to `daily_reminder`
rather than throwing, so a future type added by a migration cannot break an older client. Reproduce
that fallback.

**Side effect:** none. Unlike `NOTIF-003`, this endpoint does not trigger generation.

#### GET /api/v1/notifications/unread-count — `NOTIF-002`

`{"data": 3}` — count where `read_at IS NULL`. Backed by the partial index
`idx_notifications_unread (user_id) WHERE read_at IS NULL`.

#### GET /api/v1/notifications/recent — `NOTIF-003`

Drives the bell. **Limit 10.**

```jsonc
{
  "data": {
    "items": [
      /* ≤10 notifications */
    ],
    "unreadCount": 3,
  },
}
```

**This endpoint has a write side effect.** It calls the on-demand generator before reading (§15.2),
which may create notification rows, materialize class occurrences, and send email. It is polled
every 60 seconds by every open tab.

That coupling is deliberate — it is what makes notifications appear for an active user between cron
sweeps — but it means **a `GET` mutates state**. Options for the port:

1. **Keep it** — simplest, preserves behavior exactly. Must stay idempotent under the throttle.
2. **Split it** — make generation a separate `POST /notifications/generate` the client calls
   alongside. Cleaner HTTP semantics, requires a small frontend change.

Recommended: keep it for the initial migration (behavior parity), split it afterwards. Either way
the compare-and-set throttle (§15.1) is mandatory — without it, N open tabs generate N times.

#### POST /api/v1/notifications/{id}/read — `NOTIF-004`

Marks one notification read. **Idempotent** — the current query filters
`.eq("id", id).eq("user_id", uid).is("read_at", null)`, so re-marking an already-read notification
is a silent no-op rather than an error. `200 {"data": null}`.

#### POST /api/v1/notifications/read-all — `NOTIF-005`

Marks every unread notification for the caller as read. `200 {"data": null}`.

#### POST /api/v1/notifications/{id}/email — `NOTIF-006`

"Email me this" from the notification center.

**Both the notification and the recipient address come from the session**, so a user can only ever
email themselves. Preserve that — do not accept a recipient parameter.

`200 {"data": null}`. Errors: `404` unknown notification;
`500 {"message": "Email delivery is not configured."}` when `RESEND_API_KEY` or `EMAIL_FROM` is
unset — the current code degrades rather than throwing.

On success, stamps `notifications.emailed_at`.

#### POST /api/v1/internal/jobs/notifications — `NOTIF-007`

The cron sweep endpoint. **Not a user session** — see §16.

**Authentication:** `Authorization: Bearer <CRON_SECRET>`, compared with a length check followed by
`timingSafeEqual`. If `CRON_SECRET` is unset the route always returns `401`.

**Request:** no body is read (Supabase Cron posts `{}`). Both `GET` and `POST` are bound today.

**Responses:**

| Status | Body                                                         |
| ------ | ------------------------------------------------------------ |
| `401`  | `{"error": "Unauthorized"}`                                  |
| `200`  | `{"scanned": 42, "created": 17, "emailed": 3, "errors": []}` |
| `500`  | `{"error": "The notifications job failed."}`                 |

**A run with per-user errors still returns `200`** with those errors listed in `errors[]` — one
user's failure must not fail the sweep. Preserve that.

**Laravel:** this becomes a scheduled Artisan command
(`$schedule->job(GenerateNotifications::class)->everyFiveMinutes()`) and the HTTP endpoint can be
dropped entirely — a strict improvement, since it removes a public route and a shared secret.

---

### 7.22 Gamification

#### GET /api/v1/gamification/achievements — `GAME-001`

```jsonc
{
  "data": [
    {
      "id": "uuid",
      "key": "streak-7",
      "title": "7-Day Streak",
      "description": "…",
      "icon": "flame",
      "unlockedAt": "2026-08-20T00:00:00Z",
      "progress": 100,
    },
  ],
}
```

**Side effect:** calls `sync_user_achievements` (§9.1) before reading, so the catalog is always
freshly recomputed. The RPC is idempotent and values never regress.

**Localization note:** `achievements.title` / `description` are **English-only** in the database.
The UI ignores them and localizes client-side from `achievements.key` via `ACHIEVEMENT_I18N_KEYS`.
Keep serving the DB strings for compatibility, but understand they are not the display values.

The six seeded keys: `first-lesson`, `streak-7`, `streak-30`, `hundred-hours`,
`perfect-attendance`, `exam-ace`.

#### GET /api/v1/gamification/goals — `GAME-002`

```jsonc
{
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "period": "weekly",
      "targetMinutes": 600,
      "achievedMinutes": 420,
      "periodStart": "2026-08-24",
      "createdAt": "…",
      "updatedAt": "…",
    },
  ],
}
```

#### POST /api/v1/gamification/goals — `GAME-003`

```json
{ "period": "weekly", "targetMinutes": 600 }
```

| Field           | Rules                                       |
| --------------- | ------------------------------------------- |
| `period`        | required, `in:weekly,monthly`               |
| `targetMinutes` | required, integer, `min:1` (DB CHECK `> 0`) |

**Upsert on `(user_id, period, period_start)`** — the unique constraint means setting a goal twice in
the same period updates rather than duplicating. `period_start` is derived server-side from `period`
and today's date, not supplied by the client.

#### PATCH /api/v1/gamification/goals/{id} — `GAME-004`

Sparse `period` / `targetMinutes`. `achievedMinutes` is derived, never client-writable.

#### DELETE /api/v1/gamification/goals/{id} — `GAME-005`

`204`.

#### XP and levels — computed, never stored

There is no XP column anywhere. `GamificationProgress` is computed on every dashboard read from
`src/lib/gamification/xp.ts`:

```
xp = completedLessons        × 10
   + floor(studyMinutes/60)  × 5
   + completedHomework       × 8
   + scoredExams             × 15
   + aceExams                × 10     (exams with percentage ≥ 90)
   + unlockedAchievements    × 50
   + flashcardReviews        × 2

level          = floor(sqrt(xp / 50)) + 1
xpToNextLevel  = level² × 50 − xp
```

Port these constants verbatim (`src/lib/constants/gamification.ts`); the numbers are tunable but the
formula shape is assumed by the progress ring.

---

### 7.23 Dashboard

#### GET /api/v1/dashboard/overview — `DASH-001`

One aggregate powering the entire dashboard.

```jsonc
{
  "data": {
    "greetingName": "Sara",
    "progress": {
      "xp": 1840,
      "level": 7,
      "xpToNextLevel": 610,
      "currentStreakDays": 5,
      "longestStreakDays": 23,
    },
    "overallProgressPercent": 70,
    "todayClasses": [
      /* ClassOccurrenceWithRelations */
    ],
    "upcomingClasses": [
      /* ≤5 */
    ],
    "recentActivity": [
      {
        "id": "uuid",
        "kind": "lesson_completed",
        "label": "Quadratic equations",
        "occurredAt": "…",
      },
    ],
    "weeklySummary": {
      "totalMinutes": 420,
      "targetMinutes": 600,
      "dayBreakdown": [{ "date": "2026-08-24", "minutes": 90 }],
    },
    "assignedWork": [
      /* AssignmentForStudent[] — students only */
    ],
  },
}
```

**Performance — the single heaviest endpoint.** The current implementation issues roughly **15
round trips**, including an **unbounded full-history scan** of `study_sessions` (needed for streaks
and total minutes). This is the clearest optimization opportunity in the migration: compute the
aggregates in SQL. The output shape does not change.

**Behavior to preserve:**

- **Each widget fails independently.** One failing query yields an empty widget, never a blank page.
  Reproduce with per-section try/catch rather than one transaction.
- `greetingName` falls back in order: `profiles.full_name` → `user_metadata.full_name` → the email
  local part → `"there"`.
- `assignedWork` is **skipped entirely for teachers** (not just empty) and is `[]` for a student with
  no published assignments.
- `recentActivity` merges four sources (completed lessons, notes, completed homework, scored exams),
  each limited to 8 and ordered `updated_at DESC`, then re-sorts the union in memory and slices to 8.
- `overallProgressPercent = min(100, round(totalMinutes / targetMinutes × 100))`, and `0` when there
  is no target.
- Streaks are consecutive calendar days having at least one `study_sessions` row.

`todayClasses`/`upcomingClasses` delegate to the agenda (`OCCUR-003`), which itself triggers
occurrence materialization — so loading the dashboard can create `class_occurrences` rows.

---

### 7.24 Statistics

#### GET /api/v1/statistics/overview — `STATS-001`

```jsonc
{
  "data": {
    "cards": [
      { "key": "totalStudyHours", "label": "…", "value": 128, "suffix": "h" },
    ],
    "weeklyStudyTime": [{ "label": "Mon", "value": 90 }],
    "monthlyLessons": [{ "label": "Aug", "value": 24 }],
    "attendanceBreakdown": [{ "label": "attended", "value": 41 }],
    "subjectDistribution": [
      { "subjectName": "Mathematics", "subjectColor": "#6366F1", "value": 620 },
    ],
    "studyProgress": [{ "label": "…", "value": 0 }],
    "heatMap": [{ "date": "2026-08-24", "intensity": 3 }],
    "dailyActivity": [{ "label": "…", "value": 0 }],
    "monthlyGrowth": [{ "label": "…", "value": 0 }],
  },
}
```

Six raw scans (`study_sessions`, `lessons`, `class_occurrences`, `homework`, `exams`, `subjects`),
all aggregated in TypeScript today. `heatMap.intensity` is a bucketed `0–4` scale.

**Locale dependency:** several series produce **localized axis labels** (weekday and month names) —
the current code passes a `locale` into the shaping helpers. The Laravel port must read
`Accept-Language` (or `settings.locale`) and localize labels server-side, or the charts will render
in the wrong language. This is easy to miss because the labels look like data.

Same recommendation as the dashboard: move the aggregation into SQL.

---

### 7.25 Search

#### GET /api/v1/search — `SEARCH-001` · GET /api/v1/search/live — `SEARCH-002`

**Query:** `q` — the search string. Trimmed; an empty string returns `[]` without querying.

Both endpoints share one implementation (`runSearchQuery()` in `src/lib/search/query.ts`).
`SEARCH-001` backs the results page, `SEARCH-002` the command palette. They can be a single Laravel
route.

```jsonc
{
  "data": [
    {
      "id": "uuid",
      "kind": "lesson",
      "title": "Quadratic equations",
      "subtitle": "Mathematics",
      "path": "/lessons/list",
    },
  ],
}
```

`kind` ∈ `subject` | `lesson` | `teacher` | `note` | `tag`. **Limit 8 per source**, all scoped to
`user_id = auth.uid()`.

**Two different search strategies, deliberately:**

| Source                                | Strategy                                                                                                                               |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `lessons`, `lesson_notes`             | **Postgres full-text search** on generated `search_vector` columns (GIN-indexed), via `websearch_to_tsquery` with the `english` config |
| `subjects`, `tags`, `classes.teacher` | plain `ILIKE '%term%'` — small flat tables where FTS is not worth an index                                                             |

The `teacher` source searches `classes.teacher` (a free-text column) and de-duplicates names, which
is why it queries with `limit × 3`.

**Laravel:**

```
SearchController@index
  ↓ SearchRequest        q: required|string
  ↓ SearchService::run() → 5 parallel scoped queries, merged
```

Use `whereRaw("search_vector @@ websearch_to_tsquery('english', ?)", [$q])` for the FTS sources.
**Keep the `english` text-search configuration** even though the app is bilingual — changing it
silently changes which lessons match. Arabic content currently relies on the `ILIKE` sources and on
`english` stemming being a no-op for Arabic tokens; improving that is a product decision
(`OQ-08`), not a migration task.

---

## 8. Database Mapping

24 tables in `public`, all with RLS enabled. Derived from all 38 migrations in filename order —
this is the **final** state.

### 8.1 Read this before modelling anything

Three naming traps, all created by the consolidation migrations:

1. **`classes` means two different things.** `20260820150000_classes.sql` creates a table that
   `20260820160000_classes_consolidation.sql` later **renames to `class_occurrences`**. The same
   migration renames `class_schedules` → `classes`. So today: `classes` = the recurring weekly
   class; `class_occurrences` = its dated instances. Reading the older migration in isolation will
   mislead you.
2. **`class_schedule_entries` does not exist.** Created in `…120021`, dropped in `…120022`, replaced
   by the `classes.meetings` JSONB column.
3. **`classes` (student) ≠ `teacher_classes` (teacher).** Different owners, different columns,
   linked only by the optional nullable `classes.teacher_class_id`.

**There are no Postgres enum types.** Every enum-like column is `text` + a CHECK constraint. In
Laravel use string columns with PHP backed enums plus `Rule::in()`, and keep the CHECK constraints.

### 8.2 Table inventory

Every table has `created_at timestamptz NOT NULL DEFAULT now()`. Tables noted "no `updated_at`" lack
both the column and the `set_updated_at` trigger. All `uuid` PKs default to `gen_random_uuid()`.

#### Identity & configuration

| Table      | Purpose                                | PK                               | Notable columns                                                                                                                             | Key constraints                                      |
| ---------- | -------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `profiles` | app user record, 1:1 with `auth.users` | `id` (FK → `auth.users` CASCADE) | `full_name`, `avatar_url`, `timezone`, `role` **nullable**                                                                                  | CHECK `role in ('student','teacher')`; idx on `role` |
| `settings` | one row per user                       | `user_id` (FK CASCADE)           | `theme`, `locale`, `notification_preferences` jsonb, `grade_scale` jsonb, `notifications_generated_at`, `class_occurrences_materialized_at` | CHECK `theme in ('light','dark','system')`           |

`profiles.role` is **nullable by design** — an OAuth signup has no role until onboarding. Both
`profiles` and `settings` rows are created by `AFTER INSERT` triggers on `auth.users`.

The two `*_at` timestamps on `settings` are **throttle stamps**, not audit fields (§15.1, §7.10).

#### Study core

| Table               | Purpose                | Notable columns                                                                                                            | Key constraints                                                                                                 |
| ------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `subjects`          | a course               | `name`, `color`, `icon`, `is_archived`, `credit_hours`                                                                     | CHECK name 1–80; `color ~ '^#[0-9A-Fa-f]{6}$'`; icon in 10 values; `credit_hours > 0`                           |
| `lessons`           | one study item         | `title`, `date`, `study_status`, `review_status`, `homework_status`, `is_archived`, `class_occurrence_id`, `search_vector` | 3 status CHECKs; `search_vector` **GENERATED**; GIN index                                                       |
| `tags`              | user-defined label     | `name`, `color`                                                                                                            | UNIQUE `(user_id, name)`; name 1–40                                                                             |
| `lesson_tags`       | join                   | `lesson_id`, `tag_id`                                                                                                      | PK `(lesson_id, tag_id)`; **no `updated_at`**; owner trigger                                                    |
| `lesson_notes`      | markdown note          | `title`, `content_markdown`, `search_vector`                                                                               | title 1–160; `search_vector` GENERATED (title A + body B)                                                       |
| `attachments`       | file metadata          | `kind`, `file_name`, `storage_path`, `size_bytes`, `mime_type`                                                             | `storage_path` **UNIQUE**; kind in 4 values; `size_bytes >= 0`                                                  |
| `study_sessions`    | timed or logged study  | `started_at`, `ended_at`, `duration_minutes`                                                                               | `duration_minutes` **GENERATED** (`ceil`); CHECK `ended_at >= started_at`; partial idx `WHERE ended_at IS NULL` |
| `homework`          | private to-do          | `title`, `deadline`, `completed`                                                                                           | title 1–160; partial idx `WHERE NOT completed`                                                                  |
| `exams`             | a graded assessment    | `title`, `date`, `score`, `total_score`, `percentage`                                                                      | `percentage` **GENERATED**; `total_score > 0`; `score <= total_score`                                           |
| `flashcards`        | SM-2 card              | `front`, `back`, `ease_factor`, `interval_days`, `repetitions`, `due_date`, `last_reviewed_at`                             | `ease_factor >= 1.3`; `interval_days >= 0`; `repetitions >= 0`                                                  |
| `flashcard_reviews` | append-only review log | `quality`, `reviewed_at`                                                                                                   | `quality between 0 and 5`; **no `updated_at`**                                                                  |

`lessons`, `homework`, `exams`, `flashcards` all carry both `user_id` and a denormalized
`subject_id`. RLS keys on `user_id`.

#### Scheduling

| Table               | Purpose                | Notable columns                                                                                                    | Key constraints                                                                                   |
| ------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `classes`           | recurring weekly class | `teacher`, `location`, `meetings` jsonb, `is_active`, `teacher_class_id`                                           | CHECK `validate_class_meetings(meetings)`; `teacher_class_id` FK → `teacher_classes` **SET NULL** |
| `class_occurrences` | one dated instance     | `class_id` **NOT NULL**, `date`, `start_time`, `duration_minutes`, `attendance_status` **nullable**, `exam_status` | UNIQUE `(class_id, date)`; `duration_minutes > 0`; attendance in 4 values or NULL                 |

`classes` has **no start or end date** — it recurs indefinitely; `is_active` pauses it. The
`starts_on`/`ends_on` columns were dropped in the consolidation.

#### Teaching

| Table                    | Purpose            | Notable columns                                                                                                               | Key constraints                                                                                     |
| ------------------------ | ------------------ | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `teacher_classes`        | a teacher's class  | `teacher_id`, `name`, `subject_label` (**free text**), `description`, `is_archived`                                           | name 1–120                                                                                          |
| `class_join_codes`       | the 6-char code    | `teacher_class_id` **PK**, `code`, `rotated_at`                                                                               | `code` **UNIQUE**; `code ~ '^[A-Z0-9]{6}$'`                                                         |
| `class_enrollments`      | student ↔ class   | `teacher_class_id`, `student_id`, `status`, `joined_at`                                                                       | UNIQUE `(teacher_class_id, student_id)`; status in `active`,`removed`                               |
| `assignments`            | teacher-set work   | `teacher_class_id`, `teacher_id`, `title`, `instructions`, `due_at` **timestamptz**, `total_points`, `status`, `published_at` | title 1–160; instructions ≤ 5000; `total_points > 0`; status in `draft`,`published`                 |
| `assignment_submissions` | a student's answer | `content`, `submitted_at`, `score`, `feedback`, `graded_at`, `graded_by`                                                      | UNIQUE `(assignment_id, student_id)`; content 1–20000; feedback ≤ 5000; `graded_by` FK **SET NULL** |

`class_join_codes` is a separate table **specifically because Postgres has no column-level RLS** —
enrolled students can read `teacher_classes` but must not read the code.

`assignment_submissions.score` has **no CHECK constraint**; the `score <= total_points` rule is
cross-table and lives in the `enforce_submission_write_scope` trigger.

#### Notifications & gamification

| Table               | Purpose               | Notable columns                                                             | Key constraints                                                                                                    |
| ------------------- | --------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `notifications`     | one delivered message | `type`, `title`, `body`, `read_at`, `link_path`, `dedupe_key`, `emailed_at` | type CHECK (7 values); **UNIQUE `(user_id, dedupe_key)` — FULL, not partial**; partial idx `WHERE read_at IS NULL` |
| `achievements`      | global seeded catalog | `key` **UNIQUE**, `title`, `description`, `icon`                            | **no `user_id`, no `updated_at`**                                                                                  |
| `user_achievements` | per-user progress     | `unlocked_at`, `progress`                                                   | PK `(user_id, achievement_id)`; `progress between 0 and 100`                                                       |
| `goals`             | study-time target     | `period`, `target_minutes`, `achieved_minutes`, `period_start`              | UNIQUE `(user_id, period, period_start)`; period in `weekly`,`monthly`; `target_minutes > 0`                       |

**`idx_notifications_dedupe` must be a full unique index on `(user_id, dedupe_key)`.** It was
originally partial (`WHERE dedupe_key IS NOT NULL`), which silently broke **every** insert, because
PostgREST's `on_conflict` cannot infer a predicated index. Fixed in
`20260821120000_notifications_dedupe_index_fix.sql`. Do not "optimize" it back.

### 8.3 Cascade map — reproduce exactly

Getting this wrong loses or orphans data. `CASCADE` unless marked.

```
auth.users (delete a user)
  └── CASCADE → profiles, settings, subjects, tags, lessons, lesson_notes,
                attachments, study_sessions, homework, exams, notifications,
                goals, user_achievements, classes, class_occurrences,
                flashcards, flashcard_reviews, teacher_classes, class_enrollments,
                assignments, assignment_submissions
      └── SET NULL → assignment_submissions.graded_by

subjects  ──CASCADE→ lessons, homework, exams, flashcards, classes, class_occurrences
                     └── SET NULL → study_sessions.subject_id

lessons   ──CASCADE→ lesson_notes, attachments, homework, exams, flashcards, lesson_tags
                     └── SET NULL → study_sessions.lesson_id

classes   ──CASCADE→ class_occurrences
class_occurrences ──SET NULL→ lessons.class_occurrence_id

teacher_classes ──CASCADE→ class_join_codes, class_enrollments, assignments
assignments     ──CASCADE→ assignment_submissions
flashcards      ──CASCADE→ flashcard_reviews
tags            ──CASCADE→ lesson_tags
achievements    ──CASCADE→ user_achievements
```

The `SET NULL` edges are the ones a naive port gets wrong. They are deliberate: **logged study time
survives** deletion of the subject or lesson it was about, and **lessons survive** deletion of the
class occurrence they were attached to.

### 8.4 Generated columns

Recreate as real generated columns, not application-computed values — queries filter and aggregate
on them.

| Column                            | Definition                                                                 |
| --------------------------------- | -------------------------------------------------------------------------- |
| `lessons.search_vector`           | `setweight(to_tsvector('english', coalesce(title,'')), 'A')` — title only  |
| `lesson_notes.search_vector`      | title weight `A` ‖ `content_markdown` weight `B`                           |
| `study_sessions.duration_minutes` | `ceil(extract(epoch from (ended_at - started_at)) / 60)::int`, else `NULL` |
| `exams.percentage`                | `round((score / total_score) * 100, 2)`, else `NULL`                       |

Note `lessons.search_vector` was **rebuilt to title-only** by the class split (it previously included
the dropped `teacher`/`location` fields).

### 8.5 Soft delete inventory

There is **no `deleted_at` column anywhere.** Four tables soft-delete, each differently:

| Table               | Mechanism             | Notes                                     |
| ------------------- | --------------------- | ----------------------------------------- |
| `subjects`          | `is_archived` boolean | list endpoints return archived rows too   |
| `lessons`           | `is_archived` boolean | partial idx `WHERE NOT is_archived`       |
| `teacher_classes`   | `is_archived` boolean |                                           |
| `class_enrollments` | `status = 'removed'`  | **never deleted** — preserves submissions |

`classes.is_active` looks similar but is **not** a soft delete — it is a pause switch that stops
occurrence generation. An inactive class is still listed and editable.

### 8.6 Table classification

Per the audit brief:

| Category                                      | Tables                                                                                                                                                                                   |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Never queried by the app**                  | none — all 24 are read or written somewhere                                                                                                                                              |
| **Backend/system only** (no direct user CRUD) | `class_join_codes` (written only by RPCs), `user_achievements` (written only by `sync_user_achievements`), `flashcard_reviews` (insert-only), `lesson_tags` (managed via lesson updates) |
| **Auth-related**                              | `profiles`, `settings` (both auto-created by `auth.users` triggers)                                                                                                                      |
| **Storage-related**                           | `attachments` (+ the `storage.objects` system table)                                                                                                                                     |
| **Notification-related**                      | `notifications`, `settings` (preferences + throttle stamp)                                                                                                                               |
| **Touched by cron**                           | `settings`, `profiles`, `subjects`, `lessons`, `homework`, `class_occurrences`, `classes`, `notifications`                                                                               |
| **Global/reference data**                     | `achievements` (seeded, 6 rows, no `user_id`)                                                                                                                                            |

`achievements` is the only table without a `user_id` and the only one readable by every
authenticated user (`USING true`).

---

## 9. Database Functions & RPC Mapping

26 functions. 8 are called from the application via `supabase.rpc(...)`; the rest are RLS predicates,
trigger functions, or internal helpers. **All of the business logic in them must move to Laravel
services** — Laravel has no equivalent of `SECURITY DEFINER`.

### 9.1 Callable RPCs (8 call sites)

Each entry: signature · security · tables touched · authorization · errors · Laravel replacement.

---

**`set_my_role(p_role text) → void`** · `SECURITY DEFINER` · writes `profiles`

Called by `src/actions/onboarding.mutations.ts:19` → `setMyRole()`.

- Raises if `auth.uid()` is null.
- Raises `invalid role: %` (`22023`) unless in `('student','teacher')`.
- `UPDATE profiles SET role = p_role WHERE id = auth.uid() AND role IS NULL`.
- Raises `role already set` (`42501`) when no row matched.

→ **`RoleService::assign(User $u, string $role)`.** Keep the `AND role IS NULL` in the WHERE clause —
it is what makes this atomic.

---

**`create_teacher_class(p_name text, p_subject_label text = null, p_description text = null) → uuid`**
· `SECURITY DEFINER` · writes `teacher_classes`, `class_join_codes`

Called by `teacher-classes.mutations.ts:32`.

- Requires auth and `current_app_role() = 'teacher'` (else `42501`).
- Inserts the class, then generates a join code, retrying once on `unique_violation`.
- Returns the new class id.
- **Transactional: a class never exists without a code.**

→ **`TeacherClassService::create()`** inside `DB::transaction`.

---

**`rotate_join_code(p_class_id uuid) → text`** · `SECURITY DEFINER` · writes `class_join_codes`

Called by `teacher-classes.mutations.ts:139`.

- Requires `is_teacher_of_class(p_class_id)` (else `42501`).
- Sets a new `code` and `rotated_at = now()`, retry-once on collision. Returns the code.

→ **`JoinCodeService::rotate()`** + `TeacherClassPolicy::manage`.

---

**`join_class_by_code(p_code text) → uuid`** · `SECURITY DEFINER` · reads `class_join_codes`,
writes `class_enrollments`

Called by `enrollments.mutations.ts:27`.

- Requires auth and `current_app_role() = 'student'` (else `42501`).
- Normalizes: `upper(regexp_replace(p_code, '[^A-Za-z0-9]', '', 'g'))`.
- Unknown code → raises `invalid_join_code` (`P0001`).
- Upserts `ON CONFLICT (teacher_class_id, student_id) DO UPDATE SET status = 'active'`.
- Returns the class id.

→ **`EnrollmentService::joinByCode()`.** Preserve the normalization and the `invalid_join_code`
sentinel string (§7.13).

---

**`leave_class(p_class_id uuid) → void`** · `SECURITY DEFINER` · writes `class_enrollments`

Called by `enrollments.mutations.ts:48`. Sets `status = 'removed'` for
`(p_class_id, auth.uid())`; raises `not enrolled in this class` (`P0002`) if no row matched.

→ **`EnrollmentService::leave()`.**

---

**`sync_user_achievements() → void`** · `SECURITY DEFINER` · reads `lessons`, `study_sessions`,
`exams`, `class_occurrences`, `achievements`; writes `user_achievements`

Called by `src/actions/gamification.ts:27` → `syncAndFetchUserAchievements()`, which runs before
every achievements read and on every dashboard load.

Recomputes all six achievements for `auth.uid()`:

| Key                  | Rule                                                                                                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `first-lesson`       | ≥ 1 lesson with `study_status IN ('completed','reviewed')`                                                                                                                            |
| `hundred-hours`      | `SUM(study_sessions.duration_minutes)` vs **6000** minutes                                                                                                                            |
| `exam-ace`           | any exam with `percentage >= 90`                                                                                                                                                      |
| `streak-7`           | longest run of consecutive calendar days with a `study_sessions` row, vs 7                                                                                                            |
| `streak-30`          | same, vs 30                                                                                                                                                                           |
| `perfect-attendance` | over `class_occurrences` in the **previous full calendar month**: `count(*) FILTER (WHERE attendance_status = 'attended')` vs `count(*) FILTER (WHERE attendance_status IS NOT NULL)` |

Upserts on `(user_id, achievement_id)` with **`progress = greatest(existing, new)`** and
**`unlocked_at = coalesce(existing, new)`** — values never regress and an unlock is permanent.
Idempotent.

Streaks use a gaps-and-islands query (`day - row_number()`). `perfect-attendance` deliberately
ignores occurrences with `attendance_status IS NULL` in **both** the numerator and denominator, so
unrecorded classes neither help nor hurt.

→ **`AchievementService::sync(User $u)`.** This is the largest single piece of SQL business logic in
the system. Consider running it in a queued job after relevant writes rather than on every read.

---

**`notify_assignment_published(p_assignment_id uuid) → void`** · `SECURITY DEFINER` ·
reads `assignments`, `class_enrollments`, `settings`; writes `notifications`

Called best-effort by `assignments.mutations.ts:102`. See §7.14 for the full semantics.

→ **`NotifyAssignmentPublished` job.**

---

**`notify_submission_graded(p_submission_id uuid) → void`** · `SECURITY DEFINER` ·
reads `assignment_submissions`, `assignments`, `settings`; writes `notifications`

Called best-effort by `submissions.mutations.ts:88`. See §7.15.

→ **`NotifySubmissionGraded` job.**

**Why both of these are `SECURITY DEFINER`:** the `notifications` INSERT policy is
`WITH CHECK user_id = auth.uid()` — a user may only insert notifications **for themselves**. These
two functions must write rows for _other_ users, so they escalate. Critically, they **re-derive
authorization from the database** rather than trusting the caller. Laravel has no RLS, so the
escalation disappears — but the re-derivation must stay, as an explicit policy check inside the job.

### 9.2 RLS predicate helpers (6)

All `STABLE`, `SECURITY DEFINER`, `LANGUAGE sql`, granted only to `authenticated`. They are
`DEFINER` purely to break RLS recursion cycles — not to grant extra rights.

| Function                          | Logic                                                                                                                                 | Laravel                                         |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `current_app_role()`              | `SELECT role FROM profiles WHERE id = auth.uid()`                                                                                     | `auth()->user()->role`                          |
| `is_teacher_of_class(uuid)`       | caller owns that `teacher_classes` row                                                                                                | `$u->id === $class->teacher_id`                 |
| `is_enrolled_in_class(uuid)`      | caller has an **active** enrollment                                                                                                   | `$u->activeEnrollments()->where(...)->exists()` |
| `is_teacher_of_assignment(uuid)`  | caller owns the assignment                                                                                                            | `$u->id === $assignment->teacher_id`            |
| `can_submit_assignment(uuid)`     | assignment is `published` **and** caller is actively enrolled                                                                         | `SubmissionPolicy::create`                      |
| `shares_teacher_class_with(uuid)` | caller teaches a class the target is actively enrolled in, **or** vice versa. **Not transitive** — co-students cannot see each other. | `$u->sharesTeacherClassWith($id)`               |

Implement these as query scopes and policy helpers on the `User` model. They are used in many
policies, so a single well-tested helper each is worth it.

### 9.3 Other functions

| Function                                           | Role                                                                                                                                                                                                                                  | Laravel                                     |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `validate_class_meetings(jsonb) → boolean`         | `IMMUTABLE`; backs the `classes_meetings_valid` CHECK. Requires: JSON array, length > 0, each element has `dayOfWeek` (number 0–6, unique within the array), `startTime` matching `^([01]\d\|2[0-3]):[0-5]\d$`, `durationMinutes` > 0 | custom validation rule **+ keep the CHECK** |
| `generate_join_code() → text`                      | 10 attempts over alphabet `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no `I L O 0 1`), returning the first unused. **Revoked from all app roles** — internal only. Check-then-return is not atomic, so callers retry on unique violation.      | `JoinCodeGenerator` support class           |
| `custom_access_token_hook(jsonb) → jsonb`          | `STABLE`, `SECURITY INVOKER`; injects the `user_role` JWT claim (§12.3)                                                                                                                                                               | Sanctum token claim                         |
| `set_updated_at()`                                 | trigger fn, touches `updated_at`                                                                                                                                                                                                      | Eloquent timestamps                         |
| `handle_new_user()` / `handle_new_user_settings()` | `AFTER INSERT` on `auth.users`; create the `profiles` / `settings` rows                                                                                                                                                               | `RegistrationService` (§7.1)                |

**Seed caveat:** `supabase/seed.sql` grants `EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated`
— a **local-dev convenience that contradicts** the per-function revokes, notably for
`generate_join_code`. Production relies on the explicit grants. Do not treat the seed file as the
authorization model.

---

## 10. RLS → Laravel Authorization

**This is the section most likely to be under-implemented.** Supabase enforces authorization in the
database, so the application code above it is often permissive by design. Laravel has no RLS: every
predicate below must be reimplemented as a Policy, a Gate, middleware, or a query scope — and
**omitting one is a silent data leak, not a broken feature.**

### 10.1 The dominant pattern — owner-scoped tables

Ten tables share an identical four-policy set:

```sql
SELECT  USING       (user_id = (select auth.uid()))
INSERT  WITH CHECK  (user_id = (select auth.uid()))
UPDATE  USING       (user_id = (select auth.uid()))
        WITH CHECK  (user_id = (select auth.uid()))
DELETE  USING       (user_id = (select auth.uid()))
```

Tables: `subjects`, `tags`, `lessons`, `lesson_notes`, `attachments`, `study_sessions`, `homework`,
`exams`, `goals`, `flashcards`.

**Laravel translation — do both halves:**

```php
// 1. Policy — authorizes a specific instance
class SubjectPolicy {
    public function view(User $u, Subject $s): bool   { return $s->user_id === $u->id; }
    public function update(User $u, Subject $s): bool { return $s->user_id === $u->id; }
    public function delete(User $u, Subject $s): bool { return $s->user_id === $u->id; }
    public function create(User $u): bool             { return true; }  // user_id is server-set
}

// 2. Global scope — makes other users' rows INVISIBLE, so misses are 404 not 403
class OwnedByUserScope implements Scope {
    public function apply(Builder $b, Model $m): void {
        if (auth()->check()) $b->where($m->getTable().'.user_id', auth()->id());
    }
}
```

The scope is not optional. Without it, an unfiltered `index()` returns every user's rows, and a
`findOrFail()` on someone else's id returns `403` where Supabase returns `404` (§4.3).

**On create, always set `user_id` from the session, never from the payload.**

### 10.2 Non-standard policies — the ones that need real thought

| Table                    | Command              | Predicate                                                                                                  | Laravel                                                          |
| ------------------------ | -------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `profiles`               | SELECT               | `id = auth.uid()`                                                                                          | own profile                                                      |
| `profiles`               | SELECT               | `shares_teacher_class_with(id)`                                                                            | **the only cross-user read in the app**                          |
| `profiles`               | SELECT               | `TO supabase_auth_admin USING (true)`                                                                      | auth-hook only; no Laravel equivalent                            |
| `profiles`               | UPDATE               | `id = auth.uid()`                                                                                          | + role immutability (§11.2)                                      |
| `profiles`               | —                    | **no INSERT, no DELETE policy**                                                                            | rows created by trigger, removed by cascade                      |
| `lesson_tags`            | SELECT/INSERT/DELETE | `EXISTS (SELECT 1 FROM lessons WHERE lessons.id = lesson_tags.lesson_id AND lessons.user_id = auth.uid())` | authorize via the **parent lesson**; **no UPDATE policy**        |
| `notifications`          | INSERT               | `user_id = auth.uid()`                                                                                     | users insert only for themselves                                 |
| `notifications`          | —                    | **no DELETE policy**                                                                                       | notifications can never be deleted — do not add an endpoint      |
| `settings`               | SELECT/UPDATE only   | `user_id = auth.uid()`                                                                                     | no INSERT (trigger-created), no DELETE                           |
| `achievements`           | SELECT               | `true`                                                                                                     | public catalog to any authenticated user                         |
| `user_achievements`      | SELECT only          | `user_id = auth.uid()`                                                                                     | writes only via `sync_user_achievements`                         |
| `flashcard_reviews`      | SELECT/INSERT only   | `user_id = auth.uid()`                                                                                     | **append-only** — no UPDATE, no DELETE                           |
| `teacher_classes`        | SELECT               | `teacher_id = auth.uid() OR is_enrolled_in_class(id)`                                                      | teacher **or** enrolled student                                  |
| `teacher_classes`        | INSERT               | `teacher_id = auth.uid() AND current_app_role() = 'teacher'`                                               | role check **in the policy**, not just middleware                |
| `class_join_codes`       | SELECT/UPDATE/DELETE | `is_teacher_of_class(teacher_class_id)`                                                                    | **no INSERT policy** — RPC only                                  |
| `class_enrollments`      | SELECT               | `student_id = auth.uid() OR is_teacher_of_class(teacher_class_id)`                                         |                                                                  |
| `class_enrollments`      | UPDATE               | `is_teacher_of_class(teacher_class_id)`                                                                    | **no INSERT, no DELETE policy**                                  |
| `assignments`            | SELECT               | `is_teacher_of_class(...) OR (status = 'published' AND is_enrolled_in_class(...))`                         | drafts invisible to students                                     |
| `assignments`            | INSERT               | `teacher_id = auth.uid() AND is_teacher_of_class(...) AND current_app_role() = 'teacher'`                  | three conjuncts — keep all three                                 |
| `assignment_submissions` | SELECT               | `student_id = auth.uid() OR is_teacher_of_assignment(assignment_id)`                                       |                                                                  |
| `assignment_submissions` | INSERT               | `student_id = auth.uid() AND can_submit_assignment(assignment_id)`                                         | published + enrolled                                             |
| `assignment_submissions` | UPDATE               | `student_id = auth.uid() OR is_teacher_of_assignment(...)`                                                 | **deliberately broad** — the trigger does column scoping (§7.15) |
| `assignment_submissions` | DELETE               | `student_id = auth.uid() AND graded_at IS NULL`                                                            | ungraded only                                                    |

### 10.3 What teachers can and cannot see

Worth stating plainly, because it is easy to over-grant during a port.

**A teacher can see:** their own `teacher_classes`, join codes, assignments, and the submissions to
those assignments; plus `full_name` and `avatar_url` of students actively enrolled in their classes.

**A teacher cannot see** — no policy grants it — any student's `lessons`, `lesson_notes`,
`attachments`, `flashcards`, `flashcard_reviews`, `study_sessions`, `homework`, `exams`, `subjects`,
`classes`, `class_occurrences`, `goals`, `user_achievements`, `notifications`, `settings`, or `tags`.

The student's private study space and the teacher's classroom are almost entirely disjoint. Preserve
that boundary.

### 10.4 Mapping to Laravel constructs

| Supabase mechanism                            | Laravel construct                                                              |
| --------------------------------------------- | ------------------------------------------------------------------------------ |
| `user_id = auth.uid()` on SELECT              | **global query scope** (so misses are 404)                                     |
| `user_id = auth.uid()` on UPDATE/DELETE       | **Policy** method                                                              |
| `WITH CHECK` on INSERT                        | set the column server-side; never accept it from the client                    |
| `current_app_role() = 'x'`                    | **middleware** (`EnsureRole`) **and** a policy check — the app does both today |
| `EXISTS(... parent ...)` (e.g. `lesson_tags`) | Policy on the **parent**, plus `exists:table,id,user_id` validation            |
| `SECURITY DEFINER` cross-user writes          | **Service/Job** with an explicit re-derived authorization check                |
| Column-scoped writes (submissions)            | **separate endpoints + FormRequests**, plus an observer                        |
| Trigger-enforced invariants                   | **Model observers**, plus keeping the DB triggers as a backstop                |

---

## 11. Triggers as Backend Side Effects

30 triggers, all `FOR EACH ROW`; there are no statement-level triggers. Most are mechanical, four
carry real business rules.

### 11.1 Mechanical

- **`set_updated_at()`** on 19 tables — `BEFORE UPDATE`, sets `updated_at = now()`.
  → Eloquent's automatic timestamps. **Not on** `achievements`, `lesson_tags`, `flashcard_reviews`
  (set `public $timestamps` accordingly, or those models will try to write a nonexistent column).
- **`on_auth_user_created`** / **`on_auth_user_created_settings`** — `AFTER INSERT` on `auth.users`;
  create the `profiles` and `settings` rows. → explicit creation inside `RegistrationService`,
  wrapped in a transaction.

### 11.2 Business rules — port these deliberately

**`enforce_profile_role_immutable`** · `BEFORE UPDATE` on `profiles`

```
IF old.role IS DISTINCT FROM new.role AND old.role IS NOT NULL
  THEN RAISE ... ERRCODE 42501
```

Role is **write-once**: `NULL → student|teacher` is allowed exactly once; every other transition is
rejected. → `ProfileObserver::updating()` plus a `prohibited` rule on `role` in
`UpdateProfileRequest`. There is deliberately **no admin escape hatch**; adding one is a product
decision.

---

**`enforce_lesson_tags_owner`** · `BEFORE INSERT OR UPDATE` on `lesson_tags`
_(trigger `enforce_lesson_tags_owner` → function `enforce_lesson_tag_owner()` — note the differing
plural; both names are real)_

Raises `lesson and tag must belong to the same user` if the lesson and tag have different owners, or
either is missing. This is a **cross-table integrity rule a foreign key cannot express**.
→ validate both ids with `exists:…,user_id` in the lesson FormRequest, and keep the trigger.

---

**`enforce_enrollment_pin`** · `BEFORE UPDATE` on `class_enrollments`
**`enforce_assignment_pin`** · `BEFORE UPDATE` on `assignments`

Reject any change to `teacher_class_id`/`student_id` and `teacher_class_id`/`teacher_id`
respectively (`42501`). An enrollment or assignment can never be moved between classes.
→ mark the columns as non-fillable **and** add `prohibited` rules; keep the triggers.

---

**`enforce_submission_write_scope`** · `BEFORE UPDATE` on `assignment_submissions`

The column-level student/teacher split, plus server-stamping of `graded_by`/`graded_at` and the
cross-table `score <= total_points` check. Fully documented in §7.15. **The highest-risk trigger to
port.**

---

**`enforce_class_teacher_link`** · `BEFORE INSERT OR UPDATE OF teacher_class_id` on `classes`

```
IF new.teacher_class_id IS NOT NULL AND NOT is_enrolled_in_class(new.teacher_class_id)
  THEN RAISE ... ERRCODE 42501
```

A student may only link their personal class to a teacher class they are **actively enrolled in**.
→ a policy check in `ClassPolicy` plus an `exists` rule scoped to active enrollments.

---

## 12. Authentication Migration Specification

### 12.1 How it works today

- **Client construction:** `src/lib/supabase/server.ts` builds a request-scoped client bound to
  Next.js `cookies()`. `setAll` is wrapped in try/catch because Server Components cannot write
  cookies — token rotation is left to the middleware.
- **Session storage:** JWTs in httpOnly cookies, managed by `@supabase/ssr`.
- **Refresh:** there is **no explicit refresh call anywhere**. The cookie adapter rotates tokens as
  a side effect of `getClaims()` / `getUser()` during middleware execution.
- **Verification:** the middleware calls `supabase.auth.getClaims()` rather than `getSession()`,
  because for HS256 tokens it falls back to a real Auth-server `getUser()` (genuine verification)
  while also returning the decoded payload — including the role claim — in one call.

### 12.2 Middleware — route protection

Entry point is `src/proxy.ts` (Next.js 16 renamed `middleware.ts` → `proxy.ts`). It runs next-intl's
middleware first, then `updateSession()` composes onto that response.

**Matcher:** `["/((?!api|trpc|_next|_vercel|.*\\..*).*)"]` — excludes `api`, `trpc`, `_next`,
`_vercel`, and any path containing a dot. **Neither route handler is ever touched** by locale
rewriting or session refresh.

All decisions are made on the **locale-stripped** path segment:

```
PUBLIC_SEGMENTS          = { "", "docs", "auth/reset-password" }
SIGNED_OUT_ONLY_SEGMENTS = { "auth/login", "auth/register", "auth/forgot-password" }
ROLE_PREFIXES            = { teaching: "teacher", classroom: "student" }
ONBOARDING_SEGMENT       = "onboarding/role"
ROLE_NEUTRAL_ENTRY       = "home"
```

**Deny by default:** anything not in `PUBLIC_SEGMENTS ∪ SIGNED_OUT_ONLY_SEGMENTS` requires a session.

Flow:

1. Unauthenticated + protected → `302 {localePrefix}/auth/login?next={path}` (the `next` value is
   sanitized: must start with `/`, not `//`, no `://`).
2. Authenticated + role-relevant segment → resolve role, then:
   - lookup **error** → **fail open**, log, continue (availability over strictness);
   - role `NULL` and not already on onboarding → `302 /onboarding/role`;
   - role set and segment is `home` or a signed-out-only auth page → `302 ROLE_HOME[role]`;
   - segment matches a `ROLE_PREFIXES` key with the wrong role → `302 ROLE_HOME[role]`.
3. Otherwise continue.

`ROLE_HOME = { student: "/dashboard/overview", teacher: "/teaching/classes" }`.

Role resolution is gated behind `isRoleRelevant(segment)` so ordinary student routes never pay for
it.

**Defense in depth (the App Router cache can skip middleware):** `(app)/layout.tsx` re-checks the
session; the auth pages redirect signed-in users; the onboarding page redirects if a role is already
set; `/home` forwards by role.

**Laravel/Next split.** In the target architecture Laravel owns _API_ authorization (Sanctum +
policies) and Next.js keeps this routing middleware, swapping `getClaims()` for a call to
`GET /auth/me`. Do not try to move route protection into Laravel — it is a UI navigation concern.

### 12.3 The custom access token hook

`public.custom_access_token_hook(event jsonb) → jsonb`, `STABLE`, **`SECURITY INVOKER`**. It sets
exactly one claim:

```sql
claims := jsonb_set(claims, '{user_role}', to_jsonb(v_role));
```

**The present-but-null distinction is load-bearing:**

| Claim state                                          | Meaning                                                        |
| ---------------------------------------------------- | -------------------------------------------------------------- |
| `user_role` present, value `"student"` / `"teacher"` | role known                                                     |
| `user_role` present, value **`null`**                | hook ran; user has not completed onboarding                    |
| `user_role` **absent**                               | hook not enabled → middleware falls back to a `profiles` query |

Because the function is `SECURITY INVOKER` and Supabase runs it as `supabase_auth_admin` (which has
no RLS bypass), the migration must grant that role `USAGE` on `public`, `EXECUTE` on the function,
`SELECT` on `profiles`, **and** add a permissive read policy on `profiles` for it. Execute is
revoked from `authenticated`, `anon`, `public`.

**It is not enabled by SQL.** Enabling requires a manual Supabase Dashboard step (Authentication →
Hooks → Custom Access Token). There is no `[auth.hook]` block in `config.toml`, so **local dev never
runs it** — which is exactly why the fallback path exists.

→ **Laravel:** add `user_role` as a custom claim on the issued token, and keep a fallback that reads
`profiles.role` when the claim is absent. The three-state distinction can collapse to two, since a
Laravel-issued token always carries the claim.

### 12.4 Config gaps to close

`supabase/config.toml` sets only `site_url` and `additional_redirect_urls`. Everything else uses
Supabase CLI defaults, which means **these are currently undocumented and must be decided explicitly
for Laravel**:

| Setting                 | Supabase CLI default | Decide for Laravel                                 |
| ----------------------- | -------------------- | -------------------------------------------------- |
| Signup enabled          | yes                  | yes                                                |
| Email confirmation      | **disabled locally** | is verification required? (`OQ-01`)                |
| JWT expiry              | 3600 s               | Sanctum token expiry                               |
| Refresh token rotation  | on                   | Sanctum has no refresh tokens — see `OQ-02`        |
| Minimum password length | 6                    | **use 8** — matches the Zod schema the UI enforces |

Note the mismatch: Supabase's server-side minimum is 6 while the form requires 8. Standardize on 8.

### 12.5 Three coexisting auth idioms — normalize these

Authorization checks inside the actions layer are **not uniform**. Three patterns coexist, a result
of incremental growth. The Laravel port should collapse all three into one middleware + policy
model, but you need to recognize them to be sure nothing is missed.

**1. The shared guards** — `src/actions/auth.guards.ts`, used by the newer teacher/classroom code:

```ts
export async function requireUser(
  supabase: SupabaseServerClient,
): Promise<{ userId: string } | { error: string }>;

export async function requireRole(
  supabase: SupabaseServerClient,
  role: AppRole,
): Promise<{ userId: string; role: AppRole } | { error: string }>;
```

A discriminated union — call sites do `if ("error" in auth) return {success: false, error: auth.error}`.
Error strings are exactly `"You must be signed in."` and `"You do not have access to this action."`
`requireRole` reads `profiles.role` through a React `cache()` deduped per request by `userId`, so
repeated calls in one render hit the table once. `requireUser` is only consumed _inside_
`requireRole` — no action calls it directly.

Used by 4 files (19 call sites): `assignments.mutations.ts`, `submissions.mutations.ts`,
`teacher-classes.mutations.ts`, `enrollments.mutations.ts`.

**2. A private `getAuthedUserId(supabase)`** — the same shape, copy-pasted into 8 files:
`classes`, `lessons`, `homework`, `exams`, `flashcards`, `study-sessions`, `calendar`,
`notifications` (all `.mutations.ts`).

**3. Inline `supabase.auth.getUser()`** — `if (error || !data.user) …`, repeated at roughly 40 sites
across nearly every read file plus `subjects`, `gamification`, `lesson-notes`, `settings`,
`class-occurrences`, `attachments`, and `tags` mutations.

The guards file's own header notes the legacy sites were deliberately not refactored.

→ **Laravel:** one `auth:sanctum` middleware for pattern 3, one `EnsureRole` middleware for pattern
1, and policies for everything else. **Do not skip auditing pattern 3's ~40 sites** — they are where
an ownership check is most likely to be quietly absent, because the `.eq("user_id", uid)` filter and
RLS were both covering for it.

### 12.6 Endpoint summary

Only these are actually required by the application:

```
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/logout
GET  /api/v1/auth/me
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password
GET  /api/v1/auth/oauth/{provider}/redirect
GET  /api/v1/auth/oauth/{provider}/callback
PATCH /api/v1/users/me
POST  /api/v1/users/me/role
DELETE /api/v1/users/me
```

No refresh endpoint is needed if Sanctum tokens are long-lived. There is no email-verification
endpoint because the app implements none today.

---

## 13. Realtime

**Not used. Nothing to migrate.**

Verified by searching the entire repository for `.channel(`, `postgres_changes`, `.subscribe(`, and
`removeChannel` — **zero matches** in `src/` and `modules/`. There is no `@supabase/realtime-js`
dependency.

**Do not add Laravel Reverb, WebSockets, or Echo.** Live-ness today comes from two mechanisms:

1. **TanStack Query polling** — `src/components/shared/notification-bell.tsx` polls
   `getRecentNotifications()` every **60 s**, with `refetchOnWindowFocus: true`.
2. **`revalidatePath("/", "layout")`** after every mutation, which re-renders server components.

The polling interval and the browser-notification dedupe behavior are described in §15.4.

If push is wanted later, the cheapest upgrade preserving current behavior is **SSE on the
notifications endpoint**, not a full WebSocket stack. That is a product decision, not a migration
requirement.

---

## 14. File Storage Migration Specification

### 14.1 Current state

One bucket, defined in `20260807120016_storage_attachments.sql`:

| Property        | Value                                          |
| --------------- | ---------------------------------------------- |
| Name            | `attachments`                                  |
| **Public**      | **`true`**                                     |
| Size limit      | `52428800` (50 MB)                             |
| Allowed MIME    | 12 types (§7.7)                                |
| Path convention | `{user_id}/{lesson_id}/{timestamp}-{filename}` |

`storage.objects` policies:

| Command | Predicate                                                                        |
| ------- | -------------------------------------------------------------------------------- |
| SELECT  | `bucket_id = 'attachments'` — **any authenticated user, any file**               |
| INSERT  | `bucket_id = 'attachments' AND auth.uid()::text = (storage.foldername(name))[1]` |
| UPDATE  | same as INSERT (no `WITH CHECK` declared)                                        |
| DELETE  | same as INSERT                                                                   |

### 14.2 The security finding

**Reads are effectively unprotected.** The bucket is public _and_ the SELECT policy grants every
authenticated user access to every object. URLs are generated with `getPublicUrl()` and are
**unsigned** — there is no `createSignedUrl` call anywhere in the codebase.

Path secrecy is the only protection on read. By contrast the `public.attachments` **row** is
strictly owner-scoped, so a user cannot _enumerate_ others' files — but any leaked or guessed URL
works for anyone, forever.

**This is a genuine confidentiality gap, not a quirk.** Moving to private storage with signed URLs
is the right fix — but it is a **behavior change**, so make it a deliberate decision rather than a
silent migration side effect. In particular, any URL already shared or embedded stops working.

### 14.3 Laravel target

```
config/filesystems.php → 's3' disk (S3, R2, or MinIO)
```

| Concern       | Implementation                                                                                                                    |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Upload        | `POST /api/v1/lessons/{lessonId}/attachments`, `multipart/form-data`                                                              |
| Validation    | `file\|max:51200` (KB) `\|mimetypes:<the 12 types>`                                                                               |
| Path          | keep `{user_id}/{lesson_id}/{timestamp}-{name}` — makes data migration a straight copy                                            |
| Read          | `Storage::temporaryUrl($path, now()->addMinutes(15))` **(recommended)**, or `Storage::url()` to preserve current behavior exactly |
| Delete        | delete object, then row                                                                                                           |
| Authorization | `AttachmentPolicy` on the row; the disk stays private                                                                             |

**Two behaviors that must be preserved:**

1. **Compensating rollback** — upload the object first, insert the row second, and **delete the
   object if the insert fails**. Without it, failed uploads leak orphaned files.
2. **`kind` is derived server-side** from the MIME type, never accepted from the client.

**Server limits:** uploads pass through the application (not browser-direct). `next.config.ts` sets
a 55 MB Server Action body limit; Laravel needs matching `upload_max_filesize`, `post_max_size`, and
`client_max_body_size`.

**Data migration:** copy objects preserving the path layout, then rewrite `attachments.storage_path`
only if the prefix changes. The column is `UNIQUE`, so a partial migration is detectable.

### 14.4 Endpoints

Already specified as `ATTACH-001` … `ATTACH-003` (§7.7). No generic `/files` resource exists or is
needed — attachments are always scoped to a lesson.

---

## 15. Notification System Specification

The most behaviorally subtle subsystem. Three independent creation paths write to one table.

### 15.1 The shared throttle — implement this first

Both generation paths gate on **`settings.notifications_generated_at`** using a compare-and-set:

```sql
-- cutoff = now() - 5 minutes
UPDATE settings
   SET notifications_generated_at = now()
 WHERE user_id = ?
   AND (notifications_generated_at IS NULL OR notifications_generated_at < cutoff)
RETURNING user_id;
-- no row returned  →  another writer won  →  do nothing
```

`REFRESH_INTERVAL_MS = 5 minutes`. **The on-demand path and the cron sweep share this stamp**, which
is what stops them double-sending. A port that reads-then-writes, or that gives each path its own
stamp, will duplicate notifications.

Timestamps are compared as **instants** (`Date.parse`), never as strings — Postgres renders
`+00:00` while JS renders `Z`, so lexicographic comparison is wrong.

### 15.2 Path A — on-demand (same session)

`ensureNotificationsForUser(supabase, userId, email)` in `src/actions/notifications.generate.ts`.

- Runs **as the signed-in user**, so RLS applies.
- Called from `notificationsActions.getAll()` and `getRecentNotifications()` — i.e. **on every bell
  poll**, every 60 s per open tab.
- Claims the run (§15.1), then calls `ensureClassOccurrencesForUser()` first so `upcoming_class` has
  rows to look at.
- Windows are computed in the user's exact timezone from `profiles.timezone`.
- Upserts with `ON CONFLICT (user_id, dedupe_key) DO NOTHING` and `RETURNING`, so only genuinely new
  rows come back — that returned set is exactly the email set.
- Emails via Next.js `after()` — **after the response is sent**.
- The entire body is wrapped in try/catch and **errors are deliberately swallowed**: this runs on a
  read path and must never fail a page render.

→ **Laravel:** a `NotificationGenerator` service called from the notifications controller, with
email dispatched to the queue. Keep the swallow-and-log behavior.

### 15.3 Path B — the cron sweep (all users)

`runScheduledNotificationsJob()` in `src/actions/notifications.jobs.ts`. Uses the
**service-role client**, so RLS does not apply and **every query is hand-scoped** by
`.in("user_id", …)`. This is one of only two service-role call sites.

Why it exists: the on-demand path only runs while a user's own session is polling, which cannot fire
`upcoming_class` reminders for someone who is not looking at the app.

1. Select stale `settings` rows plus all `profiles (id, timezone, role)`.
2. **Bulk claim** via the compare-and-set, returning the claimed ids.
3. **Teachers are claimed then filtered out** — their stamp still needs refreshing, but they
   structurally have no lessons/homework/classes. A previous version emitted a spurious "nothing
   scheduled today" `daily_reminder` to every teacher every cycle.
4. `materializeTodayOccurrences()` — upserts today's `class_occurrences` from `classes.meetings`
   (`ON CONFLICT (class_id, date) DO NOTHING`).
5. Five parallel scans, windowed **±1 day around UTC** then re-filtered in memory against each
   user's local date. This is the only place in the actions layer using an embedded join
   (`class_occurrences … classes (teacher, location)`).
6. Resolve emails via `auth.admin.listUsers({perPage: 1000})` — **only** if at least one claimed
   user has email enabled.
7. Upsert notifications; email the newly created rows; stamp `emailed_at`.

Returns `{scanned, created, emailed, errors[]}`.

→ **Laravel:** `$schedule->job(GenerateNotifications::class)->everyFiveMinutes()`. The 5-minute
cadence is chosen to always land inside the 10-minute `upcoming_class` window — do not lengthen it
without also widening that threshold.

### 15.4 Generation thresholds

Identical constants in both paths:

| Constant                      | Value |
| ----------------------------- | ----- |
| `UPCOMING_LESSON_DAYS`        | 1     |
| `UPCOMING_CLASS_LEAD_MINUTES` | 10    |
| `HOMEWORK_DUE_DAYS`           | 2     |
| `REVIEW_AGE_DAYS`             | 7     |
| `REVIEW_MAX_AGE_DAYS`         | 60    |
| `REVIEW_REMINDERS_PER_RUN`    | 3     |
| `REFRESH_INTERVAL_MS`         | 5 min |

**Dedupe key formats** — these define "the same notification" and must be reproduced exactly:

```
upcoming_lesson:<lessonId>:<date>
homework_due:<homeworkId>:<deadline>
review_reminder:<lessonId>:<today>
upcoming_class:<occurrenceId>:<today>
daily_reminder:<today>
assignment_assigned:<assignmentId>              ← no date: never re-notifies
assignment_graded:<submissionId>:<gradedAt>     ← regrade re-notifies
```

### 15.5 Path C — cross-user, in SQL

`notify_assignment_published` and `notify_submission_graded` (§9.1). Neither the on-demand path nor
the cron sweep produces `assignment_*` notifications. **These send no email.**

### 15.6 Copy and localization

`src/lib/notifications/copy.ts` holds hand-written `ar`/`en` strings — deliberately **not** next-intl,
because rows are written outside any request's locale scope. Each returns `{title, body, linkPath}`.
`link_path` values: `/calendar/month`, `/homework/list`, `/dashboard/overview`, `/lessons/list`,
`/classes/list`, `/classroom/assignments`.

The two SQL functions inline their own bilingual copy, branching on `settings.locale` (`ar` vs
everything else).

→ **Laravel:** put all copy in `lang/{ar,en}/notifications.php` and render with the recipient's
`settings.locale`, **not** the request locale. This unifies the TypeScript and SQL copy, which is a
genuine improvement.

### 15.7 Email delivery

`src/lib/notifications/email-template.ts` → `renderNotificationEmail({title, body, linkPath, locale})`.
Inline-styled, table-free, `<html lang dir>` from the locale. Subject is always
`` `${notificationTypeLabel(type, locale)} — ${title}` ``. All interpolated values are HTML-escaped.

The CTA href is `${NEXT_PUBLIC_APP_URL}/${locale}${linkPath}` — **always locale-prefixed, including
`ar`**, which `localePrefix: "as-needed"` would normally strip. That produces a redirect, not a
break.

Delivery loops one email per notification and **breaks on the first failure** (a missing API key
fails all of them identically), then stamps `emailed_at` for those actually delivered.

→ **Laravel:** a Mailable + `Notification` class, queued. Per-recipient failures should not abort the
batch — an improvement over the current break-on-first-failure, and safe because `emailed_at` is
stamped per delivered row.

### 15.8 Preferences

```ts
{ enabledInBrowser: true, enabledInEmail: false, types: Record<NotificationType, boolean> }
```

All seven types default `true`; **email is off by default**. `parseNotificationPreferences()` fills
every missing key from defaults, because stored rows predate later keys — the Laravel Resource must
do the same merge (§7.3).

Preference checks use `coalesce(pref, true)`: a missing key means **enabled**.

### 15.9 Browser notifications

`src/hooks/use-browser-notifications.ts`. Purely client-side — **no backend involvement**, no push
service, no service worker. Uses the Web Notifications API directly.

- SSR-safe: `permission` starts `"denied"` and resolves in `useEffect`.
- Shown ids are persisted to `localStorage` under **`"lessonio:notified-ids"`**, capped at 200.
- The bell's first poll of a session is **baseline-only** (`markAsShown` without popups), so
  returning after days away does not burst notifications.
- OS popups additionally require `enabledInBrowser` **and** `permission === "granted"`.

Nothing here changes in the migration.

---

## 16. Cron / Scheduled Jobs

Exactly one scheduled job.

| Field           | Value                                                                                                      |
| --------------- | ---------------------------------------------------------------------------------------------------------- |
| Job name        | `notifications-sweep`                                                                                      |
| Schedule        | `*/5 * * * *` (every 5 minutes)                                                                            |
| Mechanism       | `pg_cron` + `pg_net`                                                                                       |
| Action          | `net.http_post` to `{app_url}/api/cron/notifications` with `Authorization: Bearer <secret>`                |
| Secrets         | Supabase Vault: `cron_notifications_url`, `cron_notifications_secret`                                      |
| Tables affected | `settings`, `profiles`, `subjects`, `lessons`, `homework`, `class_occurrences`, `classes`, `notifications` |
| API equivalent  | `NOTIF-007`                                                                                                |

The database calls the application over HTTP, which is why a shared secret exists at all. Secrets
live in Vault and are never committed.

**Laravel replacement — strictly simpler:**

```php
// app/Console/Kernel.php
$schedule->job(new GenerateNotifications())
         ->everyFiveMinutes()
         ->withoutOverlapping();
```

This **removes** the HTTP endpoint, the shared secret, `pg_cron`, `pg_net`, and the Vault entries.
The job calls the notification service directly in-process. Keep `withoutOverlapping()` — the
compare-and-set throttle (§15.1) already guards correctness, but overlap wastes work.

Also fold in the two lazy materializers currently triggered by read paths
(`ensureClassOccurrencesForUser`, `ensureNotificationsForUser`) if you want to decouple generation
from reads — but keep the on-demand path too, or an active user stops seeing timely notifications
between sweeps.

---

## 17. External APIs

**One external service.**

| Field          | Value                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Service        | **Resend** (transactional email)                                                                                                               |
| Access         | official `resend` npm SDK (^6.18.1) — **not** raw `fetch`                                                                                      |
| Endpoint       | `emails.send({from, to, subject, html})`                                                                                                       |
| Auth           | API key                                                                                                                                        |
| Env vars       | `RESEND_API_KEY`, `EMAIL_FROM`                                                                                                                 |
| Callers        | `emailNotifications()` in `notifications.generate.ts` and `notifications.jobs.ts`; `sendNotificationToEmail()` in `notifications.mutations.ts` |
| Error handling | missing config → `{success: false, error: "Email delivery is not configured."}`. Never throws.                                                 |

→ **Laravel:** the Resend mail driver, or SMTP. Configuration lives in `config/mail.php`; keep the
graceful-degradation behavior so a missing key never 500s a notification read.

**Supabase's own mailer** sends the password-reset email (`AUTH-007`). That template must be
**newly authored** in Laravel — it is the one email Supabase provided for free.

### 17.1 Environment variables

Names only — no values are recorded anywhere in this document.

**Public (client-bundled)** — `src/lib/env.ts`, Zod-parsed eagerly at module load:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL`

**Server-only** — `src/lib/env.server.ts`, all optional, parsed lazily and memoized:

- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `CRON_SECRET`

**Other:** `NODE_ENV` (devtools gate); `SUPABASE_PROJECT_ID` (a `package.json` script only, not
runtime).

**Database-side (Supabase Vault, not env):** `cron_notifications_url`, `cron_notifications_secret`.

**After migration**, the Supabase and cron variables disappear; the frontend needs a single new
`NEXT_PUBLIC_API_URL`, and Laravel needs its own `DB_*`, `RESEND_API_KEY`, `MAIL_FROM_ADDRESS`, and
OAuth client credentials.

### 17.2 Other outbound surfaces

- `next.config.ts` `images.remotePatterns` allows
  `https://*.supabase.co/storage/v1/object/public/**` — **must be updated** to the new storage host.
- `pg_net` issues an inbound-to-the-app HTTP POST (§16), removed by the migration.

---

## 18. Frontend API Abstraction

### 18.1 What already exists

The application is in an unusually good position. There is **no API client, no Axios, no fetch
wrapper** — because there is nothing to wrap. Instead:

| Layer                                                                        | Pattern                                                                           |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| SSR components (40+ files, `modules/**/ssr/*.tsx`)                           | `import { Actions } from "@/actions"` → `Actions.Domain.method()`                 |
| Client components (~45 files, `modules/**/csr/*.tsx`, `**/components/*.tsx`) | `import { createX } from "@/actions/<domain>.mutations"` wrapped in `useMutation` |
| Cache invalidation                                                           | `revalidatePath("/", "layout")` inside every mutation                             |

**Zero components touch Supabase directly.** The browser client has no importers at all.

### 18.2 The target

```
React components (UNCHANGED)
        ↓  Actions.Domain.method()  /  createX(...)
src/actions/**            ← swap the internals here, and only here
        ↓  apiClient.get/post/patch/delete
src/lib/api/client.ts     ← NEW: one thin fetch wrapper
        ↓  HTTP + Bearer
Laravel /api/v1
```

The `Actions` facade is already the seam. The migration adds exactly one new file and rewrites the
bodies of the action functions, keeping every signature and return type identical.

**Introduce a single client:**

```ts
// src/lib/api/client.ts  (new)
const BASE = `${process.env.NEXT_PUBLIC_API_URL}/api/v1`;

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<ActionResult<T>> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...authHeader(),
        ...init?.headers,
      },
    });
    const body = await res.json();
    if (!res.ok)
      return { data: null, error: body.message ?? "Request failed." };
    return { data: body.data as T, error: null };
  } catch {
    return { data: null, error: "Network error." };
  }
}
```

Then, for example:

```ts
// src/actions/classes.ts — after
export const classesActions = {
  async getAll(): Promise<ActionResult<ClassWithSubject[]>> {
    return apiClient.get<ClassWithSubject[]>("/classes");
  },
  // …
};
```

Every consuming component compiles unchanged.

### 18.3 Rules for the port

1. **Never call `fetch` from a component.** The current codebase has a perfect record here; keep it.
2. **The version string appears exactly once**, in `BASE`.
3. **Keep the envelopes.** `ActionResult<T>` and `MutationResult` stay; the client maps the HTTP
   response into them. This is what makes the swap invisible to the UI.
4. **Preserve soft-empty reads** (§3.5) inside the action functions — if the API ever does return
   `401` on a read, the action should still hand back `{data: [], error: null}` for the endpoints
   marked soft-empty.
5. **Normalize the three bespoke envelopes** (§3.3) in the action layer, not in components.
6. **Replace `revalidatePath`** with TanStack Query cache invalidation. This is the one genuinely
   new frontend work item: today mutations rely on blanket server revalidation, so there are no
   query keys to invalidate. Introduce per-domain query keys as the actions are converted.
7. **Token storage:** keep it in an httpOnly cookie set by a Next.js route handler, not in
   `localStorage`. That preserves today's XSS posture.

### 18.4 Recommended migration order

Convert domain by domain, keeping Supabase and Laravel side by side behind the facade — the facade
makes a per-domain cutover safe.

1. **Auth** — everything depends on the token.
2. **Settings, Subjects, Tags** — small, self-contained, no cross-user rules.
3. **Lessons, Notes, Attachments** — the largest read surface; attachments bring storage.
4. **Classes, Occurrences, Calendar** — brings the materializer.
5. **Homework, Exams, Flashcards, Study Sessions, Grades** — mechanical CRUD plus SM-2.
6. **Teacher Classes, Enrollments, Assignments, Submissions** — the authorization-heavy block; do it
   when policies are well tested.
7. **Notifications, Gamification** — brings the scheduler and the RPC-ported services.
8. **Dashboard, Statistics, Search** — pure aggregates; last, because they read everything else.

---

## 19. Target Laravel Architecture & Versioning

### 19.1 Structure

```
app/
├── Console/
│   └── Commands/                  GenerateNotificationsCommand
├── Http/
│   ├── Controllers/Api/V1/        one per domain (§6)
│   ├── Requests/                  one per write op — NEW enforcement (§4.4)
│   ├── Resources/                 camelCase output shaping (§3.2)
│   └── Middleware/
│       ├── EnsureRole.php         replaces current_app_role() checks
│       └── OptionalAuth.php       enables soft-empty reads (§3.5)
├── Models/                        24 Eloquent models (§8)
│   └── Scopes/OwnedByUserScope.php
├── Policies/                      the RLS translation (§10)
├── Observers/                     the business-rule triggers (§11.2)
├── Services/
│   ├── RoleService.php            ← set_my_role
│   ├── TeacherClassService.php    ← create_teacher_class, rotate_join_code
│   ├── EnrollmentService.php      ← join_class_by_code, leave_class
│   ├── AchievementService.php     ← sync_user_achievements
│   ├── NotificationGenerator.php  ← ensureNotificationsForUser
│   ├── ClassOccurrenceMaterializer.php
│   └── DataExportService.php
├── Jobs/
│   ├── GenerateNotifications.php
│   ├── NotifyAssignmentPublished.php
│   └── NotifySubmissionGraded.php
├── Notifications/                 mail + database channels
└── Support/
    ├── Sm2.php                    ← src/lib/flashcards/sm2.ts
    ├── Xp.php                     ← src/lib/gamification/xp.ts
    ├── GradeScale.php             ← src/lib/grades/scale.ts
    └── JoinCodeGenerator.php      ← generate_join_code()
```

`app/Support/` is the home for the four pure algorithms that must be ported **verbatim** — they
produce user-visible numbers that would silently drift if reimplemented from memory.

### 19.2 Route organization

```php
Route::prefix('v1')->group(function () {
    // public
    Route::post('auth/register', …);
    Route::post('auth/login', …);
    Route::post('auth/forgot-password', …);
    Route::post('auth/reset-password', …);
    Route::get('auth/oauth/{provider}/redirect', …);
    Route::get('auth/oauth/{provider}/callback', …);

    // soft-empty reads — optional auth (§3.5)
    Route::middleware('auth.optional')->group(fn () => /* GET auth/me, and every read marked ² */);

    // authenticated
    Route::middleware('auth:sanctum')->group(function () {
        /* all mutations, any role */

        Route::middleware('role:teacher')->prefix('teaching')->group(fn () => /* … */);
        Route::middleware('role:student')->prefix('classroom')->group(fn () => /* … */);
    });
});
```

The `teaching` / `classroom` prefixes mirror the existing Next.js route segments and the
`ROLE_PREFIXES` middleware map, so role enforcement stays legible on both sides.

### 19.3 Versioning

All endpoints live under `/api/v1`. The frontend consumes it through exactly one constant in
`src/lib/api/client.ts` (§18.2).

**Rules for keeping future upgrades non-breaking:**

- Additive changes (new optional field, new endpoint) ship within `v1`.
- Breaking changes (removed/renamed field, changed type, changed status code, changed
  authorization) require `v2`.
- Run `v1` and `v2` side by side; migrate the action layer domain by domain, exactly as in §18.4.
- **The response envelope is part of the contract.** Changing `{data, error}` is a major version
  bump even if every field inside stays the same.

Because the frontend's entire data access is ~100 functions in one directory, a version migration is
bounded and reviewable — that is the structural property worth protecting.

---

## 20. Migration Risk Report

Severity: **CRITICAL** = silent data loss, data leak, or security regression · **HIGH** = broken
core feature · **MEDIUM** = degraded behavior · **LOW** = cosmetic or easily caught.

### CRITICAL

**`RISK-01` — No server-side validation exists today**
`src/actions/` imports Zod zero times; all 13 schemas are client-side form schemas. Any payload can
be sent directly to a Server Action today, bounded only by DB CHECK constraints. Every FormRequest
in this document is **new enforcement**.
_Mitigation:_ implement the rule tables in §7 exhaustively. Treat a missing FormRequest as a bug.
_Upside:_ this is the migration's single biggest correctness win.

**`RISK-02` — RLS has no Laravel equivalent**
~60 policies enforce authorization in the database. Application code above them is permissive by
design — `.eq("user_id", uid)` filters are belt-and-braces, and in two cases absent entirely.
Dropping RLS without reimplementing every predicate is a mass data leak.
_Mitigation:_ §10, both halves — Policy **and** global scope. Audit every model for the scope.

**`RISK-03` — `gradeSubmission` has no ownership check in application code**
It filters only `.eq("id", submissionId)`. Safe today purely because of RLS plus the write-scope
trigger. A naive port lets **any teacher grade any submission in the system.**
_Mitigation:_ mandatory `SubmissionPolicy::grade` (§7.15). Add an explicit regression test.

**`RISK-04` — Trigger-enforced column scoping on submissions**
`enforce_submission_write_scope()` prevents students setting `score`/`feedback`/`graded_at`, prevents
teachers editing `content`, blocks edits to graded work, validates `score <= total_points`
cross-table, and server-stamps `graded_by`/`graded_at`. None of this is visible in the TypeScript.
_Mitigation:_ split endpoints + FormRequests + observer; keep the DB trigger as a backstop (§11.2).

**`RISK-05` — Attachment storage is effectively public**
Bucket `public: true` and a SELECT policy of `bucket_id = 'attachments'`: any authenticated user can
read any file, and URLs are unsigned and permanent.
_Mitigation:_ move to a private disk with temporary URLs (§14.2) — but note this **changes behavior**
and invalidates already-shared links. Make it a deliberate decision.

### HIGH

**`RISK-06` — Password reset request shape changes**
The current form submits only a new password, relying on Supabase's recovery session. Laravel needs
`token` and `email`. This is a real frontend change, not a swap (§7.1).

**`RISK-07` — Soft-empty reads**
Unauthenticated reads return `{data: [], error: null}`, not `401`. Several SSR components branch on
`data === null` for redirect logic. A conventional `401`-everywhere API breaks navigation app-wide
(§3.5).

**`RISK-08` — The notification throttle is a compare-and-set**
Two independent writers share `settings.notifications_generated_at`. A read-then-write port, or
per-path stamps, double-sends notifications and emails (§15.1).

**`RISK-09` — Cross-user notification writes are `SECURITY DEFINER` SQL**
`notify_assignment_published` / `notify_submission_graded` re-derive authorization from the database
rather than trusting the caller, honor per-recipient preferences, embed bilingual copy, and use
carefully chosen dedupe keys. They also send **no email**. Easy to reimplement subtly wrong (§9.1).

**`RISK-10` — Cascade and SET NULL semantics**
The `SET NULL` edges are deliberate: study sessions survive subject/lesson deletion; lessons survive
occurrence deletion. Getting these wrong destroys history (§8.3).

**`RISK-11` — Generated columns**
`duration_minutes` (note `ceil`, not `round`), `percentage`, and two `search_vector` columns are
computed in Postgres and queried directly. Reimplementing them in PHP breaks filtering and
aggregation (§8.4).

**`RISK-12` — Role is write-once**
`enforce_profile_role_immutable` allows exactly one `NULL → role` transition. There is no admin
override. A port that allows role updates changes the security model (§11.2).

### MEDIUM

**`RISK-13` — Class occurrence materialization**
A lazy, read-triggered scheduler with a 15-minute compare-and-set, a ±30-day window,
snapshotted `start_time`/`duration_minutes`, and a careful "untouched" definition for purging. If
dropped, students see no classes; if ported carelessly, recorded attendance is deleted (§7.10).

**`RISK-14` — `idx_notifications_dedupe` must stay a full unique index**
The partial version silently broke every insert. Do not re-add the predicate (§8.2).

**`RISK-15` — Statistics chart labels are localized server-side**
Weekday and month names come from the server. Missing this renders charts in the wrong language —
and it looks like data, not copy (§7.24).

**`RISK-16` — Search uses two different strategies**
Postgres FTS with the `english` config for lessons/notes; `ILIKE` for subjects/tags/teachers.
Changing the text-search configuration silently changes which rows match (§7.25).

**`RISK-17` — `revalidatePath` has no client-side equivalent**
All 43 mutations rely on blanket server revalidation. There are no query keys to invalidate today,
so per-domain cache invalidation must be introduced as part of the port (§18.3).

**`RISK-18` — Raw database errors currently reach the client**
Fixing this is correct, but a few UI strings are asserted against the current messages (§4.5).

**`RISK-19` — Dashboard is ~15 round trips with an unbounded scan**
Not a correctness risk, but it will be worse under HTTP than under co-located PostgREST. Aggregate
in SQL during the port (§7.23).

### LOW

**`RISK-20` — `404` vs `403` semantics.** RLS makes invisible rows look absent. Returning `403`
leaks existence (§4.3).

**`RISK-21` — UUID generation.** `gen_random_uuid()` server-side; Laravel must not switch to
client-generated or auto-increment ids.

**`RISK-22` — `dayOfWeek` convention.** `0 = Sunday`, centralized in one TypeScript file. PHP date
functions differ by configuration — pin it explicitly (§7.9).

**`RISK-23` — Timestamps.** All `timestamptz`. Keep the database in UTC and do per-user timezone
conversion in application code, from `profiles.timezone`.

**`RISK-24` — OAuth callback drops the locale prefix.** Existing minor defect; decide whether to
carry it over (§7.1).

**`RISK-25` — `" (Copy)"` suffix is hardcoded English** in `duplicateLesson` (§7.5).

**`RISK-26` — Achievement titles are English-only in the database** and localized client-side by
key. Do not "fix" by translating the DB rows; the UI ignores them (§7.22).

---

## 21. Open Questions

Answers are needed from the product owner, not derivable from the code.

| ID      | Question                                             | Why it matters                                                                                                                                                                                                                             |
| ------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `OQ-01` | Is email verification required on signup?            | Not implemented in app code; whatever exists is Supabase Dashboard config that the audit cannot see. Laravel needs an explicit decision.                                                                                                   |
| `OQ-02` | Token lifetime and refresh strategy?                 | Supabase uses 1 h JWTs with refresh-token rotation. Sanctum has no refresh tokens. Choose long-lived tokens or add a refresh endpoint.                                                                                                     |
| `OQ-03` | Should `GET /settings/export` include teaching data? | It currently exports 16 collections and **omits** `teacher_classes`, `class_enrollments`, `assignments`, `assignment_submissions`, `flashcards`, `flashcard_reviews`. Unclear whether deliberate or an oversight. Possible GDPR relevance. |
| `OQ-04` | Enforce `totalPoints <= 1000` on assignments?        | The ceiling exists only in the Zod form schema; the DB allows any positive value. Enforcing it server-side could reject existing rows.                                                                                                     |
| `OQ-05` | Localize the duplicated-lesson `" (Copy)"` suffix?   | Hardcoded English in an otherwise bilingual app.                                                                                                                                                                                           |
| `OQ-06` | Should late submissions be rejected?                 | `assignments.due_at` is displayed but never enforced — submissions are accepted at any time.                                                                                                                                               |
| `OQ-07` | Enforce one running study session per user?          | No unique constraint exists; only the UI prevents it. A partial unique index would fix it but may conflict with existing data.                                                                                                             |
| `OQ-08` | Improve Arabic full-text search?                     | FTS uses the `english` config for lessons and notes. Arabic content effectively relies on the `ILIKE` sources. A product decision, not a migration task.                                                                                   |
| `OQ-09` | Is the `azure` OAuth provider wanted?                | Typed as a valid `OAuthProvider` but has no UI button and no local config. Port it or drop it.                                                                                                                                             |
| `OQ-10` | Keep notification generation on a `GET`?             | The bell's polling `GET` mutates state. Preserving it is exact; splitting it is cleaner HTTP (§7.21).                                                                                                                                      |
| `OQ-11` | Should notifications ever be deletable?              | There is deliberately **no DELETE policy** on `notifications`. Confirm before adding an endpoint.                                                                                                                                          |
| `OQ-12` | Move attachments to signed URLs?                     | Fixes `RISK-05` but invalidates any already-shared link (§14.2).                                                                                                                                                                           |

### Inferred vs implemented

Everything in §6 is marked `IMPLEMENTED` except the following, which are **proposed and do not exist
today**:

- **Pagination** (`page` / `perPage` / `meta` / `links`) — `PaginatedResult<T>` is declared but never
  used; there are zero `.range()` calls (§5.1).
- **Sorting parameters** — every list has a fixed hardcoded order (§5.3).
- **`422` validation responses** — nothing validates server-side today (§4.4).
- **`201` / `204` status codes** — all writes currently return `{success: true}`.

No endpoint in this document was invented. Every one maps to an existing action function, RPC,
storage call, or route handler.

---

## 22. Summary

```
Total operations:              111
  ├─ Read endpoints:            38
  ├─ Mutation endpoints:        71
  └─ Internal (no HTTP):         2

Total Server Actions:           78   (all *.mutations.ts exports)
Total RPCs:                      8   call sites, 8 distinct functions
Total database functions:       26   (9 triggers, 6 RLS predicates, 8 RPCs, 3 other)
Total tables:                   24   (public schema, all RLS-enabled)
Total RLS policies:            ~60   distinct (89 create-policy statements incl. reissues)
Total triggers:                 30   (2 on auth.users, 28 on public tables)
Total storage buckets:           1   (attachments — public, 50 MB, 12 MIME types)
Total realtime subscriptions:    0   ← nothing to migrate
Total scheduled jobs:            1   (notifications-sweep, */5 * * * *)
Total external APIs:             1   (Resend, via SDK)
Total route handlers:            2   (auth callback, cron notifications)
Migrations reviewed:            38
```

**Migration complexity: MEDIUM-HIGH.**

Lower than it looks in one important respect: the frontend has a genuinely clean data-access
boundary — zero `fetch()` calls, one `Actions` facade, a dead browser client — so the UI layer needs
almost no change. Higher than it looks in another: **most of the authorization and a good deal of
the business logic live in the database**, in ~60 RLS policies, 8 `SECURITY DEFINER` functions, and
5 business-rule triggers, none of which is visible from the TypeScript.

**Critical risks:** `RISK-01` (no server-side validation exists), `RISK-02` (RLS has no Laravel
equivalent), `RISK-03` (`gradeSubmission` has no ownership check in code), `RISK-04`
(trigger-enforced column scoping on submissions), `RISK-05` (attachment storage is effectively
public).

**Recommended migration order:**

1. **Schema first** — all 24 tables, including generated columns, CHECK constraints, and the exact
   cascade map. Verify against a dump of the live database, not against the migration files.
2. **Auth** — Sanctum, the role claim, write-once role, the three role idioms unified.
3. **Policies and scopes** — every RLS predicate in §10, with tests, **before** any domain endpoint
   ships.
4. **Domain endpoints** in the order given in §18.4, converting `src/actions/*` domain by domain
   behind the unchanged facade.
5. **Ported algorithms** — SM-2, XP/streaks, grade scale, join codes — verified against the current
   implementations with identical inputs.
6. **Notifications and the scheduler** last, including the shared compare-and-set throttle.

Run Supabase and Laravel side by side through the facade; a per-domain cutover is safe precisely
because every call already goes through `src/actions/`.

---

_Generated from repository inspection on 2026-08-28. Sources: 47 files in `src/actions/`, 38
migrations in `supabase/migrations/`, 2 route handlers, the middleware and auth layer, 13 validation
schemas, and 30 domain type definitions. No application code was modified. No secret values appear
in this document — environment variables are referenced by name only._
