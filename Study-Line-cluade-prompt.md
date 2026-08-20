I'm building "Study Line," a production-quality Next.js study-management web app,
in phases. I'm attaching a zip of the current codebase — unpack it and continue
from there. Read through the existing code before writing anything new so you
match its conventions exactly.

TECH STACK (already scaffolded, don't change):
Next.js 16 (App Router) · React 19 · TypeScript (strict, no `any`) · Tailwind v4
ShadCN UI · React Hook Form + Zod · Zustand · TanStack Query + TanStack Table
Framer Motion · Recharts · Supabase (DB + Auth + Storage) · next-intl (en/ar)

MANDATORY ARCHITECTURE (do not deviate):
Every feature follows page.tsx → ssr/ → csr/ under modules/<domain>/<feature>/,
mirrored by a thin src/app/[locale]/<domain>/<feature>/page.tsx. page.tsx only
wraps the SSR component in Suspense — no logic, no extra imports. SSR components
(async, in ssr/) fetch data via Actions.<Domain>.<method>() from src/actions/,
apply safe null defaults, and pass typed props to CSR components ("use client",
in csr/) which own interactivity and mutations. Absolute imports only
(@/, @modules, @actions, @lib, etc.) — check tsconfig.json paths.

DESIGN SYSTEM (already built in Phase 3 — reuse these tokens, don't invent new ones):
"Ink & highlighter" palette — deep indigo primary ("Ink"), goldenrod
"highlighter" accent (used sparingly, for streaks/XP/achievements only), sage
"success", margin-red "destructive". Light mode reads as paper, dark mode as a
chalkboard. Fonts: Fraunces (font-display, hero moments only) / Geist Sans (UI)
/ Geist Mono (numbers/data). Full tokens in src/app/globals.css. .glass-panel
utility is reserved for floating overlays only (command palette, popovers,
mobile FAB menu) — never on standard cards.

RULES:

- Complete one phase at a time, in order. Stop and wait for my approval before
  starting the next phase.
- Every phase must be production-ready: no placeholders/pseudocode unless I
  ask for them, full TypeScript types, Zod validation on every form.
- Before finishing a phase: run `npx tsc --noEmit`, `npx eslint .`, and
  `npx next build` — all three must pass clean. Fix anything they catch.
- Check /mnt/skills for a Next.js architecture skill and a frontend-design
  skill before writing code — follow both.
- At the end of each phase, zip the project (excluding node_modules/.next/.git)
  and give it to me as a downloadable file, with a short explanation of what
  was built and any architectural decisions made.

PHASES (18 total — check the codebase to see what's actually done vs. just
attempted, then tell me where we really stand before proceeding):
✅ 1. Project initialization

✅ 2. Folder structure

✅ 3. Theme setup — delivered, pending my visual sign-off

✅ 4. Authentication (Supabase: login/register/forgot-password/persistent
session/logout/protected routes/middleware — note: Next.js 16 uses
proxy.ts, not middleware.ts, already renamed)

✅ 5. Database schema (Supabase Postgres: users, subjects, lessons,
lesson_notes, attachments, study_sessions, homework, exams, tags,
lesson_tags, notifications, settings, achievements, goals — FKs,
cascading deletes, indexes, RLS, audit fields)

✅ 6. Reusable UI system (Button, Card, Input, Textarea, Select, Checkbox,
Switch, Badge, Avatar, Progress Ring, Statistic Card, Lesson Card,
Subject Card, Empty State, Loading Skeleton, Calendar Item, Attachment
Card, Chart Card, Confirm Dialog, Data Table, Search Input, Filter
Sidebar, Pagination)

✅ 7. Dashboard layout (greeting, streak, progress, today's/upcoming lessons,
recent activity, weekly summary, quick actions)

✅ 8. Subject CRUD (create/edit/delete/archive, color, icon, stats)

✅ 9. Lesson CRUD (full field set, attendance/study/review/homework/exam
status enums, duplicate/archive)

✅ 10. Notes & Attachments (markdown editor, autosave, search; Supabase
Storage upload/preview/download/delete for images/PDFs/video/audio)

✅ 11. Homework & Exams (deadlines, completion, score → auto percentage)

✅ 12. Calendar (monthly, color-coded by subject, click-to-view-day,
drag-and-drop reschedule if feasible)

✅ 13. Statistics (stat cards + Recharts: weekly study time, monthly lessons,
attendance pie, subject distribution, study progress, heat map, daily
activity, monthly growth)

✅ 14. Notifications (browser notifications: upcoming lessons, homework due,
daily reminder, review reminder,send notification to email)

✅ 15. Settings (theme/language toggles already exist from Phase 3 — wire up
notification preferences, backup, export data, delete account)

✅ 16. Offline support (cache server data, queue mutations offline, auto-sync)

✅ 17. Final polish (global search, filters, gamification: XP/levels/streaks/
goals/achievements)

✅ 18. Classes CRUD (schedule class, notify upcoming class)
