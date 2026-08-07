# Study Line

A study management web app — subjects, lessons, notes, attachments, study
sessions, homework, exams, calendar, statistics, and gamification, built on
Next.js 16 + Supabase.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind v4 ·
ShadCN UI · React Hook Form + Zod · Zustand · TanStack Query + Table ·
Framer Motion · Recharts · Supabase (DB + Auth + Storage) · next-intl (en/ar)

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in your Supabase project's URL/anon key
npm run dev
```

## Architecture

Every feature follows `page.tsx → ssr/ → csr/` under
`modules/<domain>/<feature>/`, mirrored by a thin
`src/app/[locale]/<domain>/<feature>/page.tsx`. SSR components fetch data via
`Actions.<Domain>.<method>()` (`src/actions/`) and pass typed props to
`"use client"` CSR components, which own interactivity and mutations. See
each domain's action file for what's real vs. still a typed stub — every
stub has a `TODO(Phase N)` comment naming when it gets implemented.

## Database (Supabase)

The schema lives in `supabase/migrations/`, one file per table, applied in
filename order. Every table has Row Level Security enabled and owner-scoped
policies (`user_id = auth.uid()`); a few (`notifications`, `achievements`,
`settings`) are intentionally read-only or provisioned only via a trusted
trigger/service role — see the comments in each migration for why.

### Local development

```bash
npx supabase init        # already done — supabase/config.toml exists
npx supabase start       # requires Docker; spins up local Postgres + Studio
npx supabase db reset    # applies every migration in supabase/migrations/
```

### Regenerating types

`src/lib/types/database.ts` is hand-written to match the migrations exactly,
in the same shape `supabase gen types` produces. Once you have a real
project (local or hosted), regenerate it from the actual database instead of
trusting the hand-written version:

```bash
# local
npx supabase gen types typescript --local > src/lib/types/database.ts

# hosted — set SUPABASE_PROJECT_ID in .env.local first
npm run supabase:types
```

### Storage

The `attachments` bucket (public read, owner-scoped write via a
`{user_id}/...` path prefix) is created by
`supabase/migrations/20260807120016_storage_attachments.sql` — no manual
dashboard setup needed.
