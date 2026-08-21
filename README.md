# Lessonio

> A personal study-management platform designed to help students organize what they study, track their progress, manage academic responsibilities, and build consistent study habits.

---

## Table of Contents

- [Overview](#overview)
- [What Lessonio Does](#what-study-line-does)
- [Getting Started](#getting-started)
- [Core Concepts](#core-concepts)
- [Dashboard](#dashboard)
- [Subjects](#subjects)
- [Lessons](#lessons)
- [Classes](#classes)
- [Study Sessions](#study-sessions)
- [Notes & Attachments](#notes--attachments)
- [Homework](#homework)
- [Exams](#exams)
- [Calendar](#calendar)
- [Statistics](#statistics)
- [Notifications](#notifications)
- [Gamification](#gamification)
- [Settings](#settings)
- [Search & Filters](#search--filters)
- [Offline Support](#offline-support)
- [Recommended Daily Workflow](#recommended-daily-workflow)
- [Understanding Your Data](#understanding-your-data)
- [Troubleshooting](#troubleshooting)
- [Privacy & Data](#privacy--data)
- [Application Architecture](#application-architecture)
- [Technology Stack](#technology-stack)
- [Development](#development)
- [Project Structure](#project-structure)
- [Database](#database)
- [Localization](#localization)
- [Production Verification](#production-verification)
- [Roadmap](#roadmap)

---

## Overview

**Lessonio** is a study-management application that brings your academic activities into one place.

Instead of keeping your schedule, notes, homework, exams, study time, and progress in separate tools, Lessonio connects them together.

The application is designed around a simple workflow:

```text
Subjects
   ↓
Lessons
   ↓
Classes
   ↓
Study Sessions
   ↓
Notes / Homework / Exams
   ↓
Statistics & Progress
   ↓
Goals / Streaks / Achievements
```

The goal is not simply to record academic information.

The goal is to give you a clear picture of:

- What you need to study.
- When you need to study it.
- What you have already completed.
- How much time you are actually spending.
- Where you are performing well.
- Where you need more attention.
- Whether your study habits are improving over time.

---

# What Lessonio Does

Lessonio currently provides:

| Area           | Purpose                                        |
| -------------- | ---------------------------------------------- |
| Dashboard      | Overview of your academic activity             |
| Subjects       | Organize your courses/subjects                 |
| Lessons        | Manage individual study topics                 |
| Classes        | Schedule recurring or upcoming classes         |
| Study Sessions | Track actual study time                        |
| Notes          | Store structured study notes                   |
| Attachments    | Store related files                            |
| Homework       | Track assignments and deadlines                |
| Exams          | Track exams and scores                         |
| Calendar       | View academic activities by date               |
| Statistics     | Analyze study activity and progress            |
| Notifications  | Receive reminders                              |
| Gamification   | XP, levels, streaks, goals and achievements    |
| Settings       | Customize the application and manage your data |

---

# Getting Started

When using Lessonio for the first time, follow this order.

## 1. Create your account

Register using your email and password.

After authentication, Lessonio keeps your session persistent so you do not need to log in every time.

---

## 2. Create your subjects

Start by creating the subjects or courses you are currently studying.

For each subject you can define:

- Name
- Color
- Icon
- Other subject metadata

Subjects are the primary organizational layer of Lessonio.

Example:

```text
Mathematics
Physics
Computer Science
English
```

---

## 3. Add your lessons

Create lessons/topics under the appropriate subject.

A lesson represents a specific academic topic rather than a scheduled meeting.

Example:

```text
Subject: Mathematics

Lessons:
- Linear Algebra
- Matrices
- Eigenvalues
- Differential Equations
```

Lessons can then be associated with notes, homework, exams, attachments, and study sessions.

---

## 4. Schedule classes

Use **Classes** for actual scheduled teaching sessions.

For example:

```text
Mathematics Class
Monday
10:00 AM – 11:30 AM
Room 201
```

A class answers:

> "When am I supposed to attend this class?"

A lesson answers:

> "What topic am I studying?"

---

## 5. Start studying

When you actively study, use the **Focus Timer**.

The timer records your actual study session and connects the recorded time to your academic data.

This is important because Lessonio uses study-session data for:

- Weekly study statistics
- Dashboard summaries
- Subject study time
- Gamification XP
- Progress analysis

---

# Core Concepts

Understanding the difference between the main entities makes Lessonio much easier to use.

## Subject

A subject is a high-level academic category.

Example:

```text
Computer Science
```

---

## Lesson

A lesson is an academic topic belonging to a subject.

Example:

```text
Computer Science
└── Data Structures
```

A lesson represents **what you are studying**.

---

## Class

A class represents a scheduled academic session.

Example:

```text
Data Structures
Monday 09:00
```

A class represents **when you are expected to attend or participate**.

---

## Study Session

A study session represents actual time spent studying.

Example:

```text
Data Structures
Started: 18:30
Ended: 19:20
Duration: 50 minutes
```

A study session represents **what you actually studied and for how long**.

### The distinction

```text
Subject
  ↓
Lesson
  ↓
Class ────────── Scheduled activity
  ↓
Study Session ── Actual study activity
```

Keeping these concepts separate makes dashboards, statistics, and progress tracking accurate.

---

# Dashboard

The Dashboard is your daily control center.

It provides a high-level overview of your current academic activity.

Depending on your data, it can include:

- Greeting
- Current streak
- Study progress
- Today's lessons/classes
- Upcoming activities
- Recent activity
- Weekly study summary
- Quick actions

## Quick Actions

Use quick actions to perform frequent tasks without navigating through multiple pages.

For example:

- Start studying
- Add a lesson
- Add homework
- Add an exam
- Create a note

---

# Subjects

The Subjects section is the main organizational layer.

## Create a Subject

A subject can include:

- Name
- Color
- Icon

After creating a subject, you can use it as the parent for lessons and other academic activities.

## Subject Overview

A subject can provide aggregated information such as:

- Number of lessons
- Study time
- Academic activity
- Related homework
- Related exams
- Progress

## Archive vs Delete

Use **Archive** when you no longer actively study a subject but want to preserve its historical data.

Use **Delete** when you intentionally want to remove the subject and its associated data according to the application's deletion rules.

---

# Lessons

Lessons represent the actual topics you study.

A lesson can contain academic metadata related to:

- Attendance
- Study progress
- Review status
- Homework
- Exams
- Notes
- Attachments

## Lesson Statuses

Lessonio separates different types of status rather than using one generic status.

For example:

### Attendance

```text
attended
absent
late
cancelled
```

### Exam

```text
none
upcoming
completed
```

### Review

```text
not_reviewed
needs_review
reviewed
```

This separation allows the application to represent the actual academic state more accurately.

---

# Classes

Classes represent scheduled academic sessions.

Use Classes when you need to answer:

> "What classes do I have today?"

or:

> "When is my next class?"

Classes can include:

- Subject
- Schedule
- Start/end time
- Recurrence
- Upcoming-class notifications

The Dashboard and calendar can use class schedules to surface upcoming academic activities.

---

# Study Sessions

Study Sessions track actual time spent studying.

This is different from a scheduled class.

For example:

```text
Class
09:00 → 10:30
```

does not mean you studied for 90 minutes.

A study session records actual study activity:

```text
Study Session
19:00 → 19:45
45 minutes
```

## Focus Timer

The Focus Timer provides a Pomodoro-style workflow.

The standard cycle is:

```text
25 minutes — Focus
5 minutes  — Break
```

The timer is based on the actual start timestamp rather than only client-side elapsed state.

This means refreshing the page or opening another browser tab should not reset the underlying session timing.

## Starting a Session

Choose the relevant:

- Subject
- Lesson

Then start the timer.

The application creates a running study session.

## Stopping a Session

When you finish studying, stop the timer.

The session is then completed and its duration becomes available to the rest of the application.

The recorded study time contributes to:

- Dashboard summaries
- Statistics
- Subject study time
- Gamification XP

## Manual Sessions

If you studied without using the timer, you can manually record the session.

For example:

```text
Date: August 20
Start: 14:00
Duration: 90 minutes
Subject: Physics
Lesson: Mechanics
```

This is useful for study completed offline or outside the application.

## Session History

The History view lets you review previous study sessions.

Typical information includes:

- Date
- Subject
- Lesson
- Start time
- Duration

You can search and review your historical study activity.

---

# Notes & Attachments

Lessonio allows you to keep study material directly connected to your lessons.

## Notes

Notes support structured study content and markdown-style formatting.

Use notes for:

- Explanations
- Summaries
- Important concepts
- Revision material
- Personal observations

Notes support autosaving so your work is not dependent on manually saving every change.

## Attachments

Attachments can be associated with academic content.

Supported file categories include:

- Images
- PDF files
- Video
- Audio

Files are stored using Supabase Storage.

Available operations include:

- Upload
- Preview
- Download
- Delete

---

# Homework

Homework helps you track academic assignments.

A homework item can contain information such as:

- Title
- Description
- Subject
- Lesson
- Deadline
- Completion status

Use homework deadlines to keep track of upcoming academic work.

Completing homework updates its completion state and contributes to your overall activity history.

---

# Exams

The Exams section tracks upcoming and completed exams.

An exam can include:

- Exam title
- Subject
- Lesson
- Date
- Score
- Total score
- Completion state

## Exam Percentage

When both score and total score are available, Lessonio calculates the percentage automatically.

Example:

```text
Score: 85
Total: 100

Percentage: 85%
```

This calculated percentage can then be used by statistics and academic performance features.

---

# Calendar

The Calendar provides a date-oriented view of your academic activity.

Depending on the available data, calendar entries can represent:

- Lessons
- Classes
- Exams
- Homework deadlines

## Monthly View

Use the monthly calendar to understand your academic workload across the month.

## Day View

Selecting a day shows the activities scheduled for that date.

## Rescheduling

Where supported, scheduled activities can be moved through drag-and-drop.

---

# Statistics

Statistics turn your raw academic activity into measurable trends.

The Statistics section can include:

- Weekly study time
- Monthly lesson activity
- Attendance distribution
- Subject distribution
- Study progress
- Heat map
- Daily activity
- Monthly growth

## Weekly Study Time

This metric is based on recorded Study Sessions.

If you have not logged any study sessions, the weekly study-time metric will naturally remain at zero.

Once sessions are recorded, the statistics become data-driven.

## Subject Distribution

This helps identify which subjects are receiving the most attention.

## Activity Heat Map

The heat map provides a visual representation of study activity over time.

Use it to identify:

- Consistent study patterns
- Inactive periods
- High-activity periods

---

# Notifications

Lessonio can provide notifications for important academic events.

Examples include:

- Upcoming classes
- Homework deadlines
- Daily reminders
- Review reminders

Notification behavior can be configured from Settings.

> Notifications depend on the application's notification configuration and available browser/device permissions.

If browser notifications are disabled, Lessonio cannot display browser notifications until permission is granted.

---

# Gamification

Lessonio uses gamification to encourage consistent study behavior.

The system can include:

- XP
- Levels
- Streaks
- Goals
- Achievements

## XP

Study activity can contribute to XP.

For example, recorded study time can be used to calculate study-related XP.

This means accurate Study Session logging directly affects your gamification progress.

## Streaks

A streak represents consistency in your study activity.

The objective is to encourage regular study rather than isolated high-volume sessions.

## Goals

Goals provide measurable targets for your study activity.

## Achievements

Achievements recognize specific milestones or behaviors.

---

# Settings

Settings contains application-level preferences and data-management options.

Available settings include:

- Theme
- Language
- Notification preferences
- Data backup/export
- Account deletion

## Theme

Lessonio supports:

- Light mode
- Dark mode

The interface is designed around a paper-inspired light theme and chalkboard-inspired dark theme.

## Language

The application supports:

- English
- Arabic

Arabic includes RTL layout support.

---

# Search & Filters

Use search and filtering to quickly find relevant academic data.

Search and filtering are available across supported areas such as:

- Lessons
- Study Sessions
- Other data-heavy views

The objective is to avoid manually navigating large datasets.

---

# Offline Support

Lessonio includes offline-oriented behavior for previously loaded application data.

Cached server data can remain available when connectivity is temporarily unavailable.

However, offline support should be understood as **limited offline capability**, not as a fully installable offline-first application.

The current implementation does not provide a complete service-worker-based offline application.

---

# Recommended Daily Workflow

A practical Lessonio workflow looks like this:

## Morning

Open the Dashboard and review:

1. Today's scheduled activities.
2. Upcoming classes.
3. Homework deadlines.
4. Exams.
5. Current goals.

---

## During Classes

Use Classes and Lessons to maintain the relationship between:

```text
Subject
→ Lesson
→ Scheduled Class
```

Update relevant attendance information when applicable.

---

## During Study

Start a Focus Timer.

Choose:

```text
Subject
+
Lesson
```

Then study.

When finished, stop the timer.

---

## After Studying

Add or update:

- Notes
- Attachments
- Homework
- Review status

---

## End of Day

Review:

- Study time
- Completed homework
- Upcoming exams
- Daily activity
- Streak
- Goals

This creates a consistent feedback loop:

```text
Plan
 ↓
Study
 ↓
Record
 ↓
Review
 ↓
Measure
 ↓
Improve
```

---

# Understanding Your Data

Lessonio intentionally separates planning, academic content, and actual activity.

| Entity        | Main Question                                   |
| ------------- | ----------------------------------------------- |
| Subject       | What am I studying?                             |
| Lesson        | What topic am I studying?                       |
| Class         | When am I scheduled to attend?                  |
| Study Session | How long did I actually study?                  |
| Homework      | What work do I need to complete?                |
| Exam          | What assessment am I preparing for?             |
| Note          | What information do I want to remember?         |
| Attachment    | What supporting material belongs to this topic? |
| Statistics    | How am I performing over time?                  |
| Gamification  | How consistent am I?                            |

This distinction is important because scheduled time and actual study time are not necessarily the same.

---

# Troubleshooting

## My study statistics are zero

Check whether you have completed Study Sessions.

Scheduled classes do not automatically count as study time.

You need to record actual study activity using the Focus Timer or manual session logging.

---

## My XP did not increase

XP can depend on recorded activity.

If you have not logged study sessions or completed the relevant activity, XP may not change.

After recording activity, refresh the relevant dashboard/statistics view.

---

## I cannot receive browser notifications

Check:

1. Browser notification permission.
2. Lessonio notification settings.
3. Browser/site permission settings.
4. Whether the relevant notification preference is enabled.

---

## My dashboard does not show today's activity

Verify that the relevant activity has:

- Correct date
- Correct subject
- Correct lesson/class relationship
- Valid completion/status information

Then refresh the application.

---

## I accidentally started a study session

Use the cancel option while the session is still running.

Cancelled sessions are not treated as completed study time.

---

# Privacy & Data

Lessonio uses Supabase for authentication, database storage, and file storage.

User data is protected through database-level Row Level Security (RLS).

Each user's academic data is isolated from other users.

Account-level data-management features include:

- Data export/backup
- Account deletion
- Authentication management

Users should always verify their export before deleting an account.

---

# Application Architecture

This section is primarily intended for developers and maintainers.

Lessonio follows a strict feature architecture:

```text
src/app/[locale]/(app)/<domain>/<feature>/page.tsx
                    ↓
modules/<domain>/<feature>/ssr/
                    ↓
modules/<domain>/<feature>/csr/
```

The application separates server-side data loading from client-side interaction.

## Page Layer

`page.tsx` is intentionally thin.

Its responsibility is primarily:

- Suspense boundary
- Page loader
- SSR component rendering

It should not contain business logic.

---

## SSR Layer

SSR components:

- Run on the server.
- Fetch data through `Actions.<Domain>.<method>()`.
- Apply safe null defaults.
- Pass typed data to CSR components.

Example architecture:

```text
page.tsx
   ↓
FeatureSSR
   ↓
Actions.Domain.method()
   ↓
CSR View
```

---

## CSR Layer

CSR components are responsible for:

- Interactivity
- Local UI state
- Forms
- Client-side mutations
- User interactions

All forms should use:

- React Hook Form
- Zod validation
- Strict TypeScript types

---

# Technology Stack

Lessonio is built with:

- **Next.js 16**
- **React 19**
- **TypeScript**
- **Tailwind CSS v4**
- **ShadCN UI**
- **React Hook Form**
- **Zod**
- **Zustand**
- **TanStack Query**
- **TanStack Table**
- **Framer Motion**
- **Recharts**
- **Supabase**
- **next-intl**

---

# Project Structure

A simplified project structure:

```text
src/
├── actions/
│   ├── index.ts
│   ├── dashboard.ts
│   ├── subjects.ts
│   ├── lessons.ts
│   ├── homework.ts
│   ├── exams.ts
│   ├── statistics.ts
│   └── ...
│
├── app/
│   └── [locale]/
│       └── (app)/
│
├── components/
│   └── ui-system/
│
├── lib/
│   ├── constants/
│   ├── types/
│   ├── validations/
│   ├── gamification/
│   └── ...
│
└── modules/
    ├── dashboard/
    ├── subjects/
    ├── lessons/
    ├── study-sessions/
    ├── homework/
    ├── exams/
    ├── calendar/
    ├── statistics/
    ├── notifications/
    └── settings/
```

Feature-specific UI lives under `modules/`.

Reusable UI primitives live under `components/ui-system/`.

Business logic and server actions are kept separate from presentation.

---

# Database

Supabase PostgreSQL is used as the application's primary database.

The data model contains domains including:

- Users
- Subjects
- Lessons
- Classes
- Lesson Notes
- Attachments
- Study Sessions
- Homework
- Exams
- Tags
- Notifications
- Settings
- Achievements
- Goals

The database uses:

- Foreign keys
- Cascading deletes where appropriate
- `ON DELETE SET NULL` where historical records should survive
- Indexes
- Audit fields
- Row Level Security
- Database triggers

---

# Localization

Lessonio supports:

```text
English → LTR
Arabic  → RTL
```

Translations are maintained separately:

```text
messages/
├── en.json
└── ar.json
```

New user-facing features should provide translations for both locales.

RTL behavior should be implemented through the application's directional architecture rather than isolated hard-coded layout hacks.

---

# Development

## Install Dependencies

```bash
bun install
```

or:

```bash
npm install
```

---

## Run Development

Use the project's configured development command.

```bash
npm run dev
```

---

## Type Check

```bash
npx tsc --noEmit
```

---

## Lint

```bash
npx eslint .
```

---

## Production Build

```bash
npx next build
```

---

## Supabase Types

After database migrations:

```bash
npm run supabase:types
```

---

# Production Verification

Before considering a feature complete, run:

```bash
npx tsc --noEmit && \
npx eslint . && \
npx next build
```

All commands should complete successfully.

Feature verification should also include browser testing for:

- Desktop
- Mobile
- English
- Arabic
- RTL
- Light theme
- Dark theme
- Authentication state
- Empty states
- Loading states
- Error states

---

# Roadmap

The application has completed the original 18 development phases.

The next major product additions are:

## Phase 19 — Study Sessions & Focus Timer

Complete study-session functionality:

- Focus timer
- Study session history
- Manual session logging
- Real-time running-session state
- Dashboard integration
- Statistics integration
- XP integration

---

## Phase 20 — Flashcards

Planned capabilities:

- Flashcard decks
- Spaced repetition
- SM-2 scheduling
- Review history
- Due-card queue
- Review reminders
- XP for review activity

---

## Phase 21 — Grades & GPA

Planned capabilities:

- Grade scales
- Letter grades
- Grade points
- Subject averages
- Weighted GPA
- Grade trends
- Best/worst subject analysis

---

## Phase 22 — Calendar Feed

Planned capabilities:

- `.ics` export
- Calendar subscription feed
- Recurring class schedules
- Calendar import
- Preview before import
- Google/Apple Calendar integration

---

# Known Limitations

The following items are intentionally outside the current roadmap.

## Automated Background Reminders

Notifications are currently generated through application activity rather than a dedicated scheduled background job.

A future production deployment may introduce:

- Cron jobs
- Scheduled functions
- Queue workers
- Dedicated notification workers

---

## Full Offline-First Application

Current offline support focuses on cached application data.

A complete offline-first implementation would require:

- Service Worker
- Installable PWA
- Persistent offline storage
- Mutation queue
- Conflict resolution
- Background synchronization

---

## Automated Testing

Automated test coverage is currently limited.

The natural next testing targets are pure business-logic utilities such as:

- Study session calculations
- SM-2 scheduling
- Grade calculations
- GPA calculations
- ICS serialization/parsing
- Gamification calculations

---

# Product Philosophy

Lessonio is built around one principle:

> **Your study system should show what you planned, what you did, and what changed.**

The application therefore separates:

```text
Planning
   ↓
Execution
   ↓
Recording
   ↓
Measurement
   ↓
Improvement
```

The purpose of Lessonio is not to make studying more complicated.

It is to make your academic activity **visible, measurable, and actionable**.
