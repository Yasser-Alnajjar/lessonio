# Making the Employee Portal Demo-Ready

## Context

The employee portal (`src/app/[locale]/(main)`) shows almost nothing when presented to a
customer. I inspected the live stack (backend, Elasticsearch on `:9200`) rather than the
UI code alone, and the conclusion is clear: **this is a data problem, not a layout
problem.** The portal's components are fine — the indices that feed them are empty, and
the content that does exist is either unpublished, unassigned, or filtered out by an ID
mismatch.

Note: I could not log in as `admin@falconfocus.io` — entering a password into a login form
is something I don't do. Everything below comes from reading Elasticsearch directly
(no credentials needed) plus the frontend data-fetching code. Where a conclusion depends
on backend filtering logic I couldn't read, it's marked **(inferred)**.

---

## What the data actually looks like

Portal-facing indices, from `_cat/indices`:

| Index | Docs | Feeds | Verdict |
|---|---|---|---|
| `home_content` | **0** | Portal home `/` | Empty — home is a bare banner |
| `publications` | **0** | `/cybersecurity-publications` | Empty page |
| `justifications` | **0** | `/violations-justifications` | Empty tab |
| `training_progress` | **0** | Training completion state | No progress to show |
| `policies` | 44 | `/policy-center` | Only **5** have `is_published: true` (2 are junk: "ibm", "test") |
| `policy_assignments` | 12 | Policy Center per-user | admin has **2** (both `pending`) |
| `policy_acknowledgments` | 1 | Acknowledged state | Belongs to a different user |
| `violations` | 10 | `/violations-justifications` | Real data, but **no assignee field** |
| `exception_types` | 6 | `/policy-exception-requests` | Enabled, fully bilingual — best content in the portal |
| `exception_requests` | 3 | Same | All requested by `admin@falconfocus.io` |
| `training_modules` | 4 | `/mandatory-training` | Richest content — but likely filtered out (see below) |
| `tenant_settings` | 1 | Portal branding | **Every branding field is an empty string** |

The dashboard side, by contrast, is full: 858 controls, 1042 framework controls, 22
frameworks, 585 technology standards, 159 integrations, 1507 agent tasks, 79k logs.
None of that reaches the portal today.

---

## Page-by-page findings

### 1. Home `/` — completely empty (worst offender, it's the first screen)

`Main.Home` calls `/api/main/home`, backed by `home_content` which has **0 docs**. It
falls through to `defaultData` in [Home.tsx:4](src/modules/main/home/ssr/Home.tsx:4), which
supplies `welcome.title/description/sections` — but `WelcomeSection` reads
`title/subtitle/buttons`. Result: a gradient banner with a title, an empty subtitle, no
buttons, and `OverviewStats` / `QuickAccess` / `RecentActivity` all hitting their
`if (!data) return null` guards. The whole page is one empty banner.

Two field-name mismatches will keep sections broken **even after `home_content` is
seeded**:

- `transformDataForLocale` localizes `overview.stats[].label` / `.description`, but
  [OverviewStats.tsx:70](src/modules/main/home/csr/OverviewStats.tsx:70) renders
  `stat.title` / `stat.subText` → Arabic values never applied.
- It localizes `recentActivity.activities`, but
  [RecentActivity.tsx:41](src/modules/main/home/csr/RecentActivity.tsx:41) maps
  `data.items` → the section renders nothing if the backend returns `activities`.

### 2. Policy Center — 2 rows for the demo user

39 of 44 policies have no `is_published` field at all, so they never reach the portal.
`MOT-POL04` is a good example of the trap: top-level `status: "draft"`,
`is_published: false`, yet its version 1 is `published: true` — and it's the policy most
users are assigned. Purely a data-state fix.

### 3. Violations & Justifications — both tabs empty

The 10 violations are genuinely good demo material: 6 critical / 4 medium, four rule
types (Windows Defender Disabled, Password Complexity Disabled, RDP Enabled, plus one
lorem-ipsum record), with `title_ar` and `remediation_ar` already populated. But the
documents carry **no assignee field**, and the portal calls
`/api/violations/assigned` ([List.tsx:6](src/modules/main/violations/ssr/List.tsx:6)) →
nothing comes back **(inferred)**. `justifications` is empty, so the second tab is empty
by definition.

### 4. Policy Exception Requests — the one page that already works

6 enabled exception types with full `name_ar` / `description_ar` / `form_fields`
(bilingual labels, placeholders, select options), and 3 requests all raised by
`admin@falconfocus.io` — so the demo account does see its own history. Two blemishes:
`form_data` is lorem ipsum ("Laborum Ad praesent", "Ipsam velit et vero"), and all three
sit at `status: pending` with `approvals: []`, so the approval workflow visual has
nothing to display.

### 5. Mandatory Training — richest content, probably filtered out

4 published modules, bilingual throughout, 3 lessons each with themed slides
(`title_only`, `gradient` / `dark` / `brand`), quizzes, `passing_score`, certificates,
Unsplash thumbnails, 30–45 min estimates. `training_enabled: true` in tenant settings.

The likely blocker: modules carry `assigned_groups: ["all_employees"]` (**underscore**),
while every real group id in the `groups` index uses hyphens — `all-employees`,
`it-department`, `finance-department`. If the backend filters by group membership, no
module matches any user **(inferred)**. This is a one-word data fix for the highest-value
content in the portal.

### 6. Cybersecurity Publications — empty, and no way to author it

`publications` has 0 docs. I searched the admin dashboard: the only reference to
publications or home content anywhere in the frontend is the read-only GET in
[action.ts](src/lib/actions/main/action.ts). **There is no admin UI to author portal home
content or publications** — they can only be seeded backend-side.

### 7. Branding — every field blank

`tenant_settings` has `company_name`, `company_name_ar`, `logo_url`, `platform_logo_url`,
`tenant_logo_url`, `primary_color`, `secondary_color`, `footer_text`, `support_email` all
empty. So the portal renders the default Falcon logo and the default blue theme. For a
customer presentation this is the cheapest possible win — the sidebar, header and hero
gradient all read from these.

---

## Plan

### Phase 1 — Data only, no code (biggest visible change, lowest risk)

1. **Fill tenant branding** via the existing admin UI
   (`src/modules/dashboard/admin/settings` → `BrandingCard` / `ThemeCard`): company name
   (ar + en), logo, primary/secondary colour, footer, support email. Instantly rebrands
   the whole portal.
2. **Fix training group ids**: change `assigned_groups` on all 4 `training_modules` from
   `all_employees` → `all-employees`. Verify the training list populates; if it doesn't,
   the filter lives backend-side and needs a look there.
3. **Publish policies**: set `is_published: true` on the real Arabic policies (they exist
   — `سياسة أمن الشبكات`, `سياسة كلمة المرور`, `السياسة العامة للأمن السيبراني`, etc.),
   and delete the "ibm" / "test" junk policies so they stop appearing.
4. **Assign policies to the demo account** and vary the states: leave one `pending`, mark
   one `acknowledged`, set one `due_at` in the past so the overdue styling shows.
5. **Clean the 3 exception requests**: replace lorem-ipsum `form_data` with realistic
   values, and move one to `approved` and one to `rejected` with populated `approvals[]`
   so the workflow renders.

### Phase 2 — Seed the empty content indices

`home_content` and `publications` have no authoring UI, so seed them directly against
the backend (or ES) with bilingual documents. The home payload must match what the
components read (see Phase 3 — fix the components first, or seed to the current field
names):

- `welcome`: `title`, `subtitle`, `buttons[]` (`label`, `link`, `variant`, `icon` — icons
  limited to `Shield` / `AlertTriangle` per the `IconMap`)
- `overview.stats[]`: `title`, `value`, `subText`, `type`
  (`compliance` / `violations` / `pending` / `projects`), `icon`
- `quickAccess.items[]`: `title`, `description`, `link`, `actionText`, `type`, `icon`
- `recentActivity.items[]`: `title`, `description`, `time`, `type`, `icon`

Real numbers are available to populate the stats honestly: 44 policies, 10 open
violations, 3 exception requests, 4 training modules.

### Phase 3 — Code fixes in the home module

- Align `transformDataForLocale` with the components in
  [Home.tsx](src/modules/main/home/ssr/Home.tsx): localize `title`/`subText` for stats and
  `items` for recent activity (or rename in the components — pick one and apply it in
  both places).
- Repair `defaultData` so the fallback matches the `WelcomeSection` shape
  (`subtitle`, `buttons`) instead of `description`/`sections`.
- Replace the `if (!data) return null` guards with real empty states, so a missing
  section reads as intentional rather than as a broken page.
- Incidental cleanup while in these files: `RecentActivity` uses `bg-gray-200` and
  `QuickAccess`/`RecentActivity` use hardcoded `bg-orange-100` / `text-gray-600` etc.,
  which ignore the tenant theme and break in dark mode. `PolicyGrid` already does this
  correctly with `dark:` variants — follow that pattern.

### Phase 4 — Gaps that need real feature work (scope separately)

- **Violation → employee assignment**: violations have no assignee, so
  `/api/violations/assigned` can't return anything. Needs a backend field plus an admin
  assignment UI before the justification flow is demonstrable.
- **Admin authoring for portal home + publications**: currently seed-only. If the
  customer expects to manage portal content themselves, this is a missing feature, not a
  data gap.

---

## Verification

Log in yourself at `https://localhost/en/` (I can't enter the password), then tell me and
I'll drive the browser to check each page and read the actual API responses. Per page:

- `/` — hero shows subtitle + buttons; four stat cards with real numbers; quick-access
  grid; recent activity list. Check `/ar/` too — the portal defaults to Arabic via
  `handleEmployeePortalLanguageRedirect` in [proxy.ts](src/proxy.ts), so Arabic is the
  screen a customer actually sees first.
- `/policy-center` — more than 2 rows; mixed acknowledged / pending / overdue states;
  open one policy and confirm the reader and quiz render.
- `/mandatory-training` — 4 modules visible; open one and confirm the slide viewer,
  quiz and completion dialog work.
- `/policy-exception-requests` — 6 type cards; 3 requests with varied statuses.
- `/cybersecurity-publications` — content instead of an empty page.
- Confirm branding (logo, colours, company name) on every page, in both light and dark
  mode, and in RTL.

Re-run the index counts afterwards to confirm the seeding landed:

```bash
curl -s "http://localhost:9200/_cat/indices?v&h=index,docs.count&s=index" | grep -E "home_content|publications|justifications|training_progress|policy_assignments"
```
