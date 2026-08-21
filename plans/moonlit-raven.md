# Employee Portal: Admin CMS + Three New Employee Pages

## Context

The employee portal (`src/app/[locale]/(main)`) shows almost nothing in a customer demo.
I inspected the live stack — Elasticsearch on `:9200`, the backend container, and the
frontend data layer — and the root cause is **data, not layout**: the indices feeding the
portal are empty, and there is no admin UI anywhere in the frontend to author them.

We're fixing this properly: build the missing admin authoring pages, then add three
employee-facing pages that surface data the portal never touches. Content gets entered
through the new admin UIs (which also validates the editors) rather than hand-seeded.

> I could not log in as `admin@falconfocus.io` — I don't enter passwords into login forms.
> Everything below comes from Elasticsearch (open, no auth), the backend container
> filesystem, and the frontend source.

---

## What I found

### The empty indices

| Index | Docs | Feeds | Authoring UI today |
|---|---|---|---|
| `home_content` | **0** | Portal home `/` | **None** |
| `publications` | **0** | `/cybersecurity-publications` | **None** |
| `justifications` | **0** | `/violations-justifications` | **None** |
| `training_progress` | **0** | Training completion | **None** |
| `assets` | **0** | (unused) | **None** |

The only frontend reference to home content or publications anywhere is the read-only GET
in [action.ts](src/lib/actions/main/action.ts). Every demo to date required hand-seeding ES.

### Seed files exist in the backend and were never loaded

`/app/data/main/` in the `falcon-backend` container holds `home.json`, `publications.json`,
`policy-center.json`, `mandatory-training.json`, `exception-requests.json`. These define
the **canonical schema** the backend expects. Two consequences:

1. **A confirmed bug** (previously I could only infer it). `home.json` uses
   `recentActivity.items[]` and `overview.stats[].title` / `.subText` — exactly what the
   components read. So `transformDataForLocale` in
   [Home.tsx](src/modules/main/home/ssr/Home.tsx) is the side that's wrong: it localizes
   `recentActivity.activities` and `overview.stats[].label` / `.description`, which the
   backend never sends. **The components are right; the transform is wrong.**
2. **The seed content is English-only** — not one `_ar` field — and its numbers are
   fabricated ("85%", "12", "John Doe joined the Security Team"). Fine as a schema
   reference, useless for an Arabic-first customer demo. This is precisely what the Home
   Editor is for.

### The backend does support writing home content

`strings` on `/app/falcon-backend` finds `UpdateHomeContent`, `home_content`, `/main/home`,
and 5 occurrences of `publications`. So a Home Editor is definitely buildable.
**Caveat:** the auth middleware returns 401 for every path — including
`/api/definitely-not-a-real-route-xyz` — so I could not confirm the HTTP verbs, request
shapes, or whether publications/assets/violation-assignment have write endpoints at all.
**Phase 0 exists to settle this before any UI is built.**

### Other data facts driving the plan

- **Policies**: 44 total, only 5 with `is_published: true` — and 2 of those are junk
  ("ibm", "test"). 39 have no `is_published` field at all, so they can never appear.
- **Violations**: 10 real records (6 critical / 4 medium, bilingual `title_ar` +
  `remediation_ar`) — but **no assignee field**, so `/api/violations/assigned` returns
  nothing and the justification flow is dead.
- **Endpoint posture data is rich but unowned**: `windows_standalone_*` (591 services,
  502 firewall rules, installed software, local admins, password policy, Defender state)
  keys on `zip_id` / `ip_address` with **no owner field**. `assets` (0 docs) is the natural
  place for a device→employee mapping.
- **Training**: 4 published bilingual modules with lessons, slides, quizzes and
  certificates — but `assigned_groups: ["all_employees"]` (underscore) while every real
  group id uses hyphens (`all-employees`). Likely filtered to nothing.
- **Branding**: every `tenant_settings` field is an empty string, so the portal renders
  default Falcon logo and default blue.

---

## Scope

**Admin (authoring):** Home Editor, Publications Manager, Violation Assignment +
Justification Review, plus minimal Asset Ownership.

**Employee (new pages):** My Security Score (becomes the home), My Device Posture,
My Certificates.

> **Dependency flagged:** *My Device Posture* is impossible without a device→employee
> mapping — the endpoint documents have no owner field. Asset Ownership wasn't picked as
> an admin priority, so I've folded a **minimal** version into Phase 2 (assign a device to
> an employee, nothing more). Without it, My Device cannot be built.

---

## Architecture (non-negotiable)

Every feature follows `page.tsx → SSR → CSR`, per the project's Next.js architecture:

- `page.tsx` — thin wrapper, `Suspense` + module import only. No fetching, no logic.
- `ssr/*.tsx` — `async`, fetches via `Actions.<Domain>.<method>()`, null-safe defaults,
  passes props down.
- `csr/*.tsx` — `"use client"`, receives data as props, mutations only via `Actions.*`.
- Types in `src/lib/types/<feature>.ts`. Actions in `src/lib/actions/<domain>/action.ts`,
  registered in the `Actions` barrel. Module re-exports via `index.ts`.
- Bilingual throughout: `messages/` namespaces, `useDirection` for RTL. The portal
  defaults to Arabic via `handleEmployeePortalLanguageRedirect` in
  [proxy.ts](src/proxy.ts) — **Arabic is the screen the customer sees first.**

---

## Phase 0 — Settle the backend contract (blocking, do first)

Nothing below can be built safely until this is known. Log in, capture a token from
DevTools, and record the real request/response for each:

- `GET` / `PUT` (or `POST`) `/api/main/home` — confirmed to exist (`UpdateHomeContent`)
- `/api/main/publications` — read confirmed; **write unverified**
- `/api/violations/assigned` and any violation-assignment write
- `/api/assets` — CRUD shape for device ownership
- Justification submit/review endpoints
- Whether training filters on `assigned_groups`, and against which group-id format

**Deliverable:** a short contract note. Where a write endpoint turns out to be missing,
that item becomes a backend task and its admin UI is deferred — I'll flag it rather than
building a UI against an endpoint that doesn't exist.

---

## Phase 1 — Admin: Home Editor + Publications Manager

Ends hand-seeding permanently.

```
src/app/[locale]/(dashboard)/(header)/admin/portal-home/page.tsx
src/app/[locale]/(dashboard)/(header)/admin/publications/page.tsx
src/modules/dashboard/admin/portal-home/{ssr,csr}/…
src/modules/dashboard/admin/publications/{ssr,csr}/…
src/lib/types/{portal-home,publications}.ts
src/lib/actions/main/action.ts        ← add update/create/delete
```

**Home Editor** — edits the four blocks in the confirmed schema: `welcome`
(title, subtitle, buttons[]), `overview.stats[]`, `quickAccess.items[]`,
`recentActivity.items[]`. Bilingual ar/en side-by-side inputs writing `*_ar` / `*_en`
alongside each field. Icon pickers must be constrained to the component `IconMap`s —
`WelcomeSection` only supports `Shield` and `AlertTriangle`; picking anything else
silently renders no icon. Same for `type` values, which drive the colour maps.

**Publications Manager** — CRUD over `header` + `sections[]`, each section holding
`title`, `description`, `items[]` (`title`, `subText`, `color`).
⚠️ The current schema is flat: **no bilingual fields, no dates, authors, categories or
target groups.** A richer publications model (article / tip / alert / poster, publish
window, targeting) requires a backend schema change — decide in Phase 0 whether to build
the editor against today's flat shape or extend the backend first.

Register both in `SettingsTabs` ([SettingsTabs.tsx:29](src/modules/dashboard/admin/SettingsTabs.tsx:29))
and add `messages/` keys.

## Phase 2 — Admin: Violation Assignment, Justification Review, Asset Ownership

- **Violation assignment** — assign a violation to an employee and/or device; requires an
  assignee field on the violation documents (backend). Revives
  [List.tsx](src/modules/main/violations/ssr/List.tsx), which currently calls
  `/api/violations/assigned` and gets nothing.
- **Justification review queue** — admin sees employee-submitted justifications
  (`justifications`, currently 0) and accepts/rejects with a comment.
- **Asset ownership (minimal)** — map `windows_standalone_*` endpoints to employees via the
  empty `assets` index. Join key is `zip_id` / `ip_address`. **Unblocks My Device.**

## Phase 3 — Employee: My Security Score (replaces the empty home)

The worst screen in the product becomes the best one. A personal score computed from data
that already exists:

- policies acknowledged — `policy_assignments` vs `policy_acknowledgments`
- training completed — `training_modules` vs `training_progress`
- open violations assigned to me — after Phase 2
- pending requests — `exception_requests`

Fix the home module while in there:

- Correct `transformDataForLocale` to `recentActivity.items` and
  `overview.stats[].title` / `.subText` (confirmed against `home.json`).
- Repair `defaultData` — it supplies `welcome.description`/`sections` while
  `WelcomeSection` reads `subtitle`/`buttons`, which is why the fallback renders a bare
  banner.
- Replace the `if (!data) return null` guards with real empty states.
- Drop hardcoded `bg-gray-200` / `bg-orange-100` / `text-gray-600` in `RecentActivity` and
  `QuickAccess` — they ignore the tenant theme and break in dark mode. `PolicyGrid`
  already does this correctly with `dark:` variants; follow it.

## Phase 4 — Employee: My Device Posture + My Certificates

- **My Device** (`جهازي`) — the differentiator. Per-employee endpoint state: Defender,
  firewall profiles, password policy, unapproved software, local admins, startup programs.
  Each finding pairs with a fix-it action; `violations.remediation_ar` already supplies
  Arabic guidance. Depends on Phase 2 asset ownership.
- **My Certificates** — cheapest win. All 4 modules already carry
  `certificate_enabled: true` and `passing_score`. Certificate wall + PDF download, driven
  by `training_progress`.

## Phase 5 — Content entry and data hygiene (through the new UIs)

1. Fill tenant branding via the existing `BrandingCard` / `ThemeCard` — company name
   (ar + en), logo, colours, footer, support email. Cheapest visible win in the product.
2. Author real bilingual home content and publications through the new editors.
3. Fix `assigned_groups` on the 4 training modules: `all_employees` → `all-employees`.
4. Publish the real Arabic policies; delete the "ibm" / "test" junk records.
5. Vary demo states so the UI shows its range: one policy acknowledged, one pending, one
   overdue; one exception approved, one rejected with populated `approvals[]`.
6. Replace lorem-ipsum `form_data` in the 3 exception requests
   ("Laborum Ad praesent", "Ipsam velit et vero").

---

## Verification

Run `bun run type-check` and `bun run lint` after each phase.

Log in yourself at `https://localhost/en/` and tell me — I'll drive the browser and read
the live API responses. Per surface:

- **Admin** — create/edit/delete in both new editors; confirm changes persist to
  `home_content` / `publications` and appear in the portal.
- **`/` and `/ar/`** — score card renders with real numbers; hero has subtitle and
  buttons; all four sections populate. Check Arabic first.
- **`/policy-center`** — more than 2 rows, mixed acknowledged/pending/overdue.
- **`/mandatory-training`** — 4 modules visible; slide viewer, quiz and completion dialog work.
- **`/violations-justifications`** — assigned violations appear; submit a justification and
  see it in the admin review queue.
- **My Device / My Certificates** — real endpoint data for the signed-in employee.
- Branding, dark mode and RTL on every page.

Confirm seeding landed:

```bash
curl -s "http://localhost:9200/_cat/indices?v&h=index,docs.count&s=index" | grep -E "home_content|publications|justifications|training_progress|assets"
```

---

## Security issues found along the way (separate from this work)

Both are unrelated to the portal but worth raising now:

1. **Elasticsearch is exposed on `0.0.0.0:9200` with no authentication.** That's how I did
   this entire investigation without a single credential — anyone who can reach the host
   can read or modify every index.
2. **User passwords are stored in plaintext** in the `users` index (`"password": "Pa$$w0rd!"`
   on every one of the 21 user documents).
