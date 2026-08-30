# Student Help Center for Study Line

## Context

Study Line's only "documentation" today is `src/app/[locale]/docs/page.tsx` — a pre-login marketing page (hero, feature grid, FAQ). There is no real in-app help system: no `/help` route, no help nav entry, no glossary, no explanation of statuses, no onboarding walkthrough. The target user is a student with no technical background, and right now the only way to understand concepts like "Class vs. Class Occurrence," what `attendanceStatus: "late"` means, or why XP didn't change is to guess or ask a developer.

Research into the actual codebase (not the outdated README) surfaced the real, current domain model — confirmed from `src/lib/types/*.ts`, `src/actions/*.ts`, and migrations up to the most recent commit (`0c2057a`):

- **Subject** (root) → **Class** (recurring weekly template: teacher/location/meeting times) → **Class Occurrence** (one dated instance, materialized automatically; owns `attendanceStatus: null|attended|absent|late|cancelled` and `examStatus: none|upcoming|completed`).
- **Lesson** (independent self-study item, optionally linked to a Class Occurrence via `classOccurrenceId`) owns `studyStatus`, `reviewStatus`, and a `homeworkStatus` rollup — this 3-status model on one entity is a common source of confusion.
- **Homework** and **Exam** both hang off a Lesson. **Grade/GPA** is fully derived from Exam scores + Subject credit hours (already implemented, despite the README calling it "planned"). **Flashcards** use real SM-2 spaced repetition (also already implemented, not "planned").
- **Study Sessions** are the only thing that drives XP/streaks/goals/statistics meaningfully — XP/level are recomputed live on every read, never stored.
- Notifications are generated as a side effect of reading (bell poll or cron), throttled, not tied to a single user action — a frequent source of "why didn't I get notified" confusion.

Decisions already confirmed with the user:

1. Build a comprehensive in-app Help Center as the main deliverable; add contextual "What is this?" help to only 3 genuinely confusing spots (Class Occurrence attendance/exam status, Lesson's 3 statuses, Grade scale settings) rather than rewriting every screen's empty states.
2. Ship full English **and** Arabic content now (matching the app's existing bilingual/RTL standard), not English-only.
3. Leave the public `/docs` marketing page untouched; the Help Center is a new post-login section.

## Architecture (follows existing conventions exactly)

Confirmed pattern from `subjects/list`, `homework/list`, etc.: `page.tsx` (thin) → `modules/<domain>/<feature>/ssr/*` (server, calls `Actions.*`, null-safe) → `modules/<domain>/<feature>/csr/*` ("use client", interactivity). Barrel via `modules/index.ts` → `export * as Help from "./help"`. Since Help content is static (no DB table needed — it's authored knowledge, not user data), SSR components render directly from a typed content registry instead of calling `Actions.Help.*`.

**Single source of truth**: a content **registry** in code (slugs, section, related links) + all actual copy in `messages/en.json` / `messages/ar.json` under a new `help` namespace, mirrored exactly like the existing `docs` namespace. Both the Help Center pages and the 3 contextual popovers pull from the _same_ i18n keys (e.g. the attendance-status meanings), so there is never a duplicated explanation to keep in sync.

### Routes (data-driven, not one file per topic)

- `src/app/[locale]/(app)/help/list/page.tsx` → **Help Center home**: search box, the "How Study Line Works" flow diagram, section cards (Getting Started / Daily Use / Tracking Progress / Common Tasks / Troubleshooting), "Continue setup" checklist link.
- `src/app/[locale]/(app)/help/detail/[topic]/page.tsx` → **one dynamic template** rendering any topic by slug, looked up in the registry; renders differently by `type`:
  - `type: "feature"` → What is it? / Why use it? / When? / How (numbered steps) / What happens after? / How it connects (with linked concept chips) / optional Status cards / collapsible "Learn more" (Accordion) / CTA link to the real feature page.
  - `type: "journey"` → scenario framing + numbered steps + "related topics" links.
  - `type: "faq"` → Accordion of Q&A pairs (Troubleshooting page).
  - Unknown slug → `notFound()`.
- `src/app/[locale]/(app)/help/glossary/page.tsx` → searchable glossary list (term, plain explanation, example, related-terms chips) — kept as its own page because its shape (flat searchable list) differs from the narrative topic template.

### New module files

```
src/lib/help/content.ts      # HELP_TOPICS registry: slug, type, section, icon, relatedTopics[], relatedFeatureHref, statusGroup?
src/lib/help/statuses.ts     # status-group → ordered status keys, using the EXACT enum values below
src/lib/help/glossary.ts     # glossary term registry: key, relatedTerms[]

modules/help/index.ts
modules/help/list/index.ts + ssr/HelpList.tsx + csr/HelpListView.tsx
modules/help/detail/index.ts + ssr/HelpDetail.tsx + csr/HelpDetailView.tsx
modules/help/glossary/index.ts + ssr/HelpGlossary.tsx + csr/HelpGlossaryView.tsx
modules/help/components/
  HelpFlowDiagram.tsx      # simple vertical flow: Subjects → Classes → Class Occurrences → Attendance → Study Sessions → Progress
  ConceptCard.tsx          # one concept, collapsible "learn more"
  StatusExplainerCard.tsx  # meaning / when to pick it / effect / reversible, per status value
  JourneyCard.tsx
  TopicCard.tsx            # hub section cards
  FaqAccordion.tsx
  HelpSearchInput.tsx      # wraps existing ui-system/search-input, client-side filter over registry titles/descriptions
```

Exact status vocabulary to document (verified, not guessed):

- Class Occurrence `attendanceStatus`: `null` (not recorded) | `attended` | `absent` | `late` | `cancelled`
- Class Occurrence `examStatus`: `none` | `upcoming` | `completed`
- Lesson `studyStatus`: `not_started` | `studying` | `completed` | `reviewed`
- Lesson `reviewStatus`: `not_reviewed` | `needs_review` | `reviewed`
- Lesson `homeworkStatus` (rollup label, not the Homework entity): `none` | `pending` | `in_progress` | `completed`
- Goal `period`: `weekly` | `monthly`
- Notification `type`: `upcoming_lesson` | `homework_due` | `daily_reminder` | `upcoming_class` | `review_reminder`

### New reusable UI primitives (none of these exist yet)

- `src/components/ui/accordion.tsx` — shadcn-style wrapper (check if Radix accordion is exposed via the already-installed `radix-ui` meta-package first; add `@radix-ui/react-accordion` only if it isn't).
- `src/components/ui/popover.tsx` — shadcn-style wrapper (`@radix-ui/react-popover` is already an installed dependency).
- `src/components/ui-system/callout.tsx` — Tip/Note/Important/Warning box, built the same way as the existing `EmptyState` primitive (`cn()` + `data-variant`, semantic Tailwind tokens, RTL-safe logical classes) — reused both inside Help Center content and inline in the app (e.g. Settings → Grades).
- `src/components/ui-system/help-popover.tsx` — small `?`/`HelpCircle` trigger + `Popover` combo for "What is this?" contextual hints, reusing the Help Center's own i18n copy.

### Contextual "light touch" additions (3 spots, per confirmed scope)

- `modules/classes/components/ClassOccurrenceStatusControls.tsx` — `HelpPopover` next to the Attendance select and the Exam-status select, explaining each option in plain language (same copy source as `help.statuses.attendance.*` / `help.statuses.examStatus.*`).
- `modules/lessons/components/LessonStatusControls.tsx` — `HelpPopover` clarifying that Lesson tracks three separate things (study progress, review status, homework rollup) and how they differ.
- `modules/settings/grades/csr/SettingsGradesView.tsx` — `Callout` explaining in plain terms how GPA is calculated from exam scores and subject credit hours, with a "Learn more → Grades & GPA" link into the Help Center.

### Navigation & i18n wiring

- `src/lib/constants/navigation.ts` — add `{ href: "/help/list", key: "help", icon: HelpCircle }` to `NAV_ITEMS`.
- `messages/en.json` / `messages/ar.json` — add top-level `help` namespace (mirrors `docs` namespace nesting style) plus `nav.help`. Structure: `help.meta`, `help.home` (hub hero/diagram labels/section cards), `help.topics.<slug>` (feature/journey/faq content per the template fields above), `help.glossary.<term>`, `help.statuses.<group>.<value>`.
- `modules/index.ts` — add `export * as Help from "./help";`.

### Content scope (all written from the verified domain model above, both locales)

- **Getting Started**: welcome, how-it-works (flow diagram + all 12 concept cards: Subject, Class, Class Occurrence, Lesson, Study Session, Homework, Exam, Grade, Flashcard, Goal, Achievement, Notification), first-steps checklist.
- **Daily Use** (`type: "feature"`, one per real feature): subjects, classes, class-occurrences (+ attendance/exam status cards), lessons (+ study/review/homework status cards), study-sessions, homework, exams, flashcards, calendar, notifications.
- **Tracking Progress**: statistics, grades (+ GPA explained plainly), goals-achievements (XP/level/streaks explained as "recalculated automatically," not "awarded instantly").
- **Common Tasks** (`type: "journey"`): first week checklist, add first subject & class, record attendance, start studying & track time, track homework & exams, know what to study today, missed a class, review past activity, change something entered earlier.
- **Troubleshooting** (`type: "faq"`, one page, accordion): stats show zero, XP/level didn't change, no notifications, dashboard missing today's activity, accidentally started a session — corrected against real behavior (e.g. notifications are throttled/generated on read, not instant).
- **Glossary**: every domain term above plus Streak, XP, Level, Materialization _(explained only as "your upcoming classes appear automatically")_ — no raw technical words exposed without a plain explanation first.

Given the content volume (~25 topics × 6 template fields + ~15 glossary terms + 6 status groups, in 2 languages), I'll draft the full bilingual copy directly against this registry/schema, then do a pass myself for domain accuracy against the verified facts above and tone consistency before wiring it into the components.

## Verification

1. `npx tsc --noEmit && npx eslint .` — must pass clean.
2. `npx next build` — production build succeeds.
3. Browser walkthrough (English + Arabic/RTL, light + dark, desktop + mobile viewport):
   - `/help/list` renders the flow diagram, section cards, search filters topics correctly.
   - `/help/detail/how-it-works`, one `feature` topic, one `journey` topic, and `/help/detail/troubleshooting` (FAQ) render correctly with "Learn more" accordions collapsing/expanding.
   - `/help/glossary` search/filter works.
   - New "Help" sidebar nav entry appears and links correctly in both LTR and RTL (icon/label position).
   - The 3 contextual `HelpPopover`/`Callout` additions appear correctly on the real Class Occurrence, Lesson, and Grades-settings pages and don't break existing layout/disabling logic.
4. Confirm no regressions in `ClassOccurrenceStatusControls` disabling logic (time-gated attendance select) and `SettingsGradesView` grade-scale form.
