# Task: Generate Complete API Contract for Laravel Migration

We currently have a Next.js application backed by Supabase.

I want you to perform a complete codebase audit and document **every API / backend operation currently used by the application**, with the goal of eventually replacing Supabase with a **PHP Laravel backend** without changing the frontend business logic significantly.

## Primary Goal

Create a complete, implementation-ready API specification that another developer can use to rebuild the entire backend in Laravel.

Do NOT modify the application code yet.

Your job is to inspect the entire codebase and produce a backend/API contract.

---

# 1. Audit the Entire Codebase

Search the entire repository for every backend interaction, including:

- Supabase client calls
- Supabase server client calls
- Supabase browser client calls
- Server Actions
- Route Handlers
- API routes
- RPC calls
- Database queries
- `.from()`
- `.select()`
- `.insert()`
- `.update()`
- `.upsert()`
- `.delete()`
- `.rpc()`
- `.eq()`
- `.in()`
- `.order()`
- `.limit()`
- `.range()`
- `.single()`
- `.maybeSingle()`
- authentication calls
- storage calls
- realtime subscriptions
- database functions
- database triggers
- cron-triggered backend operations
- external API calls
- email operations
- notification operations

Also inspect:

- `src/actions`
- `src/app/api`
- server utilities
- repositories
- services
- hooks
- providers
- middleware
- authentication/authorization logic
- Supabase migrations
- SQL functions
- RLS policies
- database triggers
- storage policies
- scheduled jobs

Do not assume an operation is an API just because it has `/api` in its path.

---

# 2. Build an API Inventory

For every backend operation, create an entry containing:

### API ID

Use a stable identifier such as:

`AUTH-001`
`USERS-001`
`CLASSES-001`
`ASSIGNMENTS-001`

### Domain

Examples:

- Authentication
- Users
- Classes
- Lessons
- Assignments
- Submissions
- Notifications
- Settings
- Dashboard
- Files
- Analytics

### Current Implementation

Explain exactly how the frontend currently performs the operation.

Example:

```text
Supabase:
supabase.from("classes").select(...)
```

or:

```text
Server Action:
createClass()
```

or:

```text
RPC:
supabase.rpc("create_class", ...)
```

### Proposed REST API

Define the Laravel-compatible endpoint.

Example:

```http
GET /api/v1/classes
POST /api/v1/classes
GET /api/v1/classes/{id}
PATCH /api/v1/classes/{id}
DELETE /api/v1/classes/{id}
```

### HTTP Method

GET / POST / PUT / PATCH / DELETE

### Authentication

Specify:

- public
- authenticated
- teacher
- student
- admin
- owner
- etc.

### Authorization

Document the exact authorization rules currently enforced by Supabase/RLS.

Do NOT simplify this.

If RLS currently says:

```text
user can only read classes where user_id = auth.uid()
```

document the equivalent Laravel authorization requirement.

### Request

Document:

- URL params
- query params
- headers
- request body
- content type
- required fields
- optional fields
- validation rules
- enum values
- default values

Example:

```json
{
  "name": "Mathematics",
  "description": "Algebra",
  "teacher_id": "uuid"
}
```

### Response

Provide the exact expected response shape.

Example:

```json
{
  "data": {
    "id": "uuid",
    "name": "Mathematics",
    "description": "Algebra",
    "teacher_id": "uuid"
  }
}
```

### Errors

Document:

- validation errors
- unauthorized
- forbidden
- not found
- conflict
- server errors

Example:

```json
{
  "message": "You are not authorized to update this class."
}
```

### Pagination

If the operation returns lists, document:

- pagination strategy
- page
- per_page
- cursor if applicable
- total
- next/previous links

Example:

```http
GET /api/v1/classes?page=1&per_page=20
```

### Filtering

Document all supported filters.

Example:

```http
GET /api/v1/classes?status=active&teacher_id=123
```

### Sorting

Document supported sorting fields and direction.

### Relationships

Document related resources returned by the current Supabase query.

Example:

```text
Class
 ├── teacher
 ├── students
 ├── assignments
 └── schedule
```

---

# 3. Supabase → Laravel Mapping

For EVERY API, explain how the current Supabase implementation maps to Laravel.

Use this structure:

```text
Supabase
    ↓
Current table/query/RPC
    ↓
Laravel Controller
    ↓
Laravel FormRequest
    ↓
Laravel Policy
    ↓
Laravel Service
    ↓
Eloquent Model
    ↓
Database
```

Example:

```text
Current:
supabase.from("classes").select("*").eq("teacher_id", user.id)

Laravel:

GET /api/v1/classes

ClassController@index()
    ↓
ClassRequest
    ↓
ClassPolicy
    ↓
ClassService::listForTeacher()
    ↓
Class::query()->where("teacher_id", auth()->id())
```

---

# 4. Database Mapping

Inspect all Supabase migrations.

Document every table used by the application.

For each table provide:

```text
Table
Purpose
Primary Key
Columns
Data Types
Nullable
Defaults
Foreign Keys
Indexes
Unique Constraints
Check Constraints
Created/Updated timestamps
Soft delete requirements
Relationships
```

Also identify:

- tables that are never used
- tables used only by backend logic
- tables used only for authentication
- tables used for storage
- tables used for notifications
- tables used by cron jobs

---

# 5. Supabase RPC Functions

Find every PostgreSQL function called through:

```ts
supabase.rpc(...)
```

For each RPC document:

```text
RPC name
Purpose
Arguments
Argument types
Return type
Tables accessed
Tables modified
Authorization logic
Security definer/invoker
Side effects
Errors
Frontend callers
Laravel replacement
```

Then provide the equivalent Laravel implementation strategy.

Example:

```text
Supabase RPC:
notify_assignment_published()

Laravel replacement:
NotificationService::assignmentPublished()
```

---

# 6. RLS Policies

This is extremely important.

Inspect every RLS policy affecting application data.

For every policy document:

```text
Table
Operation
Policy name
Who can perform it
Condition
WITH CHECK condition
Referenced user/role
```

Then translate it into Laravel authorization.

Example:

```text
Supabase RLS:

teacher_id = auth.uid()

Laravel:

ClassPolicy::update(User $user, Class $class)
{
    return $class->teacher_id === $user->id;
}
```

Identify policies that require:

- Laravel Policies
- Gates
- Middleware
- Service-level authorization
- Query scopes

---

# 7. Authentication

Document the entire authentication flow.

Inspect:

- signup
- login
- logout
- session retrieval
- refresh token
- password reset
- email verification
- OAuth if present
- current user
- role handling
- onboarding
- middleware protection

Explain how Supabase Auth currently works.

Then design the Laravel equivalent.

Prefer:

```text
Laravel Sanctum
```

unless the current architecture clearly requires another strategy.

Document:

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/logout
GET  /api/v1/auth/me
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password
```

Only include endpoints that are actually required by the application.

---

# 8. File Storage

Inspect every Supabase Storage usage.

For each operation document:

- bucket
- upload
- download
- signed URLs
- delete
- file metadata
- access restrictions
- file size limits
- MIME restrictions

Then define the Laravel equivalent.

Prefer Laravel Filesystem with S3-compatible storage where appropriate.

Example:

```http
POST /api/v1/files
GET /api/v1/files/{id}
DELETE /api/v1/files/{id}
```

---

# 9. Notifications

Audit the complete notification system.

Document:

- notification types
- creation
- delivery
- read/unread
- mark as read
- mark all as read
- deletion if supported
- triggers
- RPCs
- cron jobs
- realtime behavior

Define Laravel equivalents.

---

# 10. Realtime

Find all:

```text
channel()
on()
subscribe()
postgres_changes
```

Document every realtime subscription.

For each:

```text
Channel
Table
Event
Filter
Consumer
Purpose
```

Then propose the Laravel replacement.

Possible solutions:

- Laravel Reverb
- WebSockets
- polling
- SSE

Recommend the simplest architecture that preserves current behavior.

---

# 11. Cron / Scheduled Jobs

Inspect:

- pg_cron
- scheduled functions
- cron endpoints
- notification jobs
- cleanup jobs
- recurring tasks

For every scheduled operation document:

```text
Job
Schedule
Trigger
Purpose
Tables affected
API equivalent
Laravel Scheduler equivalent
```

Example:

```php
$schedule->job(ProcessNotifications::class)
    ->everyMinute();
```

---

# 12. External APIs

Find every external service used by the application.

For each:

```text
Service
Base URL
Endpoint
Method
Authentication
Request
Response
Error handling
Environment variables
Frontend callers
```

Do not expose actual secrets.

Only document environment variable names.

---

# 13. Frontend API Abstraction

Identify whether the application already has:

- API clients
- fetch wrappers
- Axios
- server actions
- repositories
- service layers

Recommend a target abstraction that allows:

```text
React/Next.js
      ↓
API Client
      ↓
Laravel API
```

instead of coupling UI components directly to Supabase.

---

# 14. Target Laravel Architecture

Design the recommended Laravel backend structure.

Example:

```text
app/
├── Http/
│   ├── Controllers/Api/V1/
│   ├── Requests/
│   └── Resources/
│
├── Models/
├── Policies/
├── Services/
├── Actions/
├── Notifications/
├── Jobs/
└── Support/
```

Recommend:

- Laravel API Resources
- Form Requests
- Policies
- Services
- Jobs
- Events
- Notifications
- Sanctum
- Eloquent
- Laravel Scheduler
- Laravel Reverb if realtime is required

---

# 15. API Versioning

Use:

```text
/api/v1/...
```

for all proposed APIs.

Explain how the frontend should consume this version.

The objective is to make future backend migrations/version upgrades possible without breaking the frontend.

---

# 16. API Contract Output

Create a single comprehensive document:

```text
docs/API_CONTRACT.md
```

Structure it as:

# API Contract

## 1. Architecture Overview

## 2. Authentication

## 3. API Conventions

## 4. Error Format

## 5. Pagination

## 6. Domains

### Authentication

### Users

### Classes

### Lessons

### Assignments

### Submissions

### Notifications

### Settings

### Dashboard

### Files

### Analytics

### etc.

For every endpoint:

```text
### GET /api/v1/classes

Purpose:
Authentication:
Authorization:

Query Parameters:

Request:

Response:

Errors:

Current Supabase Implementation:

Laravel Implementation:

Database Tables:

RLS / Authorization Rules:
```

---

# 17. API Matrix

At the beginning of the document, create a complete matrix:

| ID        | Method | Endpoint           | Domain  | Auth | Role            | Current Supabase | Laravel Replacement   |
| --------- | ------ | ------------------ | ------- | ---- | --------------- | ---------------- | --------------------- |
| AUTH-001  | POST   | /api/v1/auth/login | Auth    | No   | -               | Supabase Auth    | Sanctum               |
| CLASS-001 | GET    | /api/v1/classes    | Classes | Yes  | Teacher/Student | classes select   | ClassController@index |

Include EVERY operation.

---

# 18. Migration Risk Report

At the end, create:

## Migration Risks

Identify everything that cannot be migrated by simply replacing the Supabase client.

Especially:

- RLS
- RPCs
- database triggers
- auth
- storage
- realtime
- cron
- database functions
- generated UUIDs
- timestamps
- foreign keys
- cascading deletes
- notification side effects

Classify each:

```text
LOW
MEDIUM
HIGH
CRITICAL
```

---

# 19. Missing / Ambiguous APIs

Do NOT invent behavior.

If the frontend expects data but the backend implementation is unclear, create:

## Open Questions

and list exactly what needs clarification.

If an API is inferred rather than directly implemented, mark it:

`INFERRED`

If directly observed in code:

`IMPLEMENTED`

---

# 20. Important Rules

1. Do NOT modify application code.
2. Do NOT invent endpoints that are not justified by the existing application.
3. Do NOT omit internal Server Actions just because they are not HTTP APIs.
4. Treat every Server Action as a backend operation that must eventually have a Laravel equivalent.
5. Treat every Supabase RPC as a backend operation.
6. Treat RLS as application authorization requirements.
7. Treat triggers as backend side effects.
8. Treat storage as an API/domain.
9. Treat realtime as an API/backend capability.
10. Preserve existing business behavior.
11. Do not expose secrets.
12. Include exact file paths and function names for every current implementation.
13. Include enough detail that a Laravel developer can implement the backend without inspecting the Next.js codebase again.

---

# Final Deliverables

Produce:

1. `docs/API_CONTRACT.md`
2. Complete API matrix
3. Complete Supabase → Laravel mapping
4. Database schema mapping
5. RPC mapping
6. RLS → Laravel Policy mapping
7. Auth migration specification
8. Storage migration specification
9. Realtime migration specification
10. Cron/Scheduler mapping
11. External API inventory
12. Migration risk report
13. Open questions / ambiguities

At the end provide a short summary:

```text
Total APIs:
Total Server Actions:
Total RPCs:
Total Tables:
Total RLS Policies:
Total Storage Buckets:
Total Realtime Subscriptions:
Total Scheduled Jobs:
Total External APIs:

Migration Complexity:
Critical Risks:
Recommended Migration Order:
```

The output must be based on actual repository inspection, not assumptions.
