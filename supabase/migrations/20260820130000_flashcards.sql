create table public.flashcards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  -- Denormalized from lessons.subject_id (resolved server-side on write, same
  -- pattern as homework/exams) so decks can filter by subject without a join.
  -- Always cascades in step with lesson_id: a subject delete cascades to its
  -- lessons first, which cascades here — never reachable independently.
  subject_id uuid not null references public.subjects (id) on delete cascade,
  front text not null,
  back text not null,
  -- SM-2 (SuperMemo 1987) scheduling state. New cards are due immediately.
  ease_factor numeric not null default 2.5 check (ease_factor >= 1.3),
  interval_days integer not null default 0 check (interval_days >= 0),
  repetitions integer not null default 0 check (repetitions >= 0),
  due_date date not null default current_date,
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.flashcards is 'Matches src/lib/types/flashcard.ts Flashcard.';

create index idx_flashcards_user on public.flashcards (user_id);
create index idx_flashcards_lesson on public.flashcards (lesson_id);
create index idx_flashcards_subject on public.flashcards (subject_id);
-- Fast lookup for "cards due today" (the review queue).
create index idx_flashcards_user_due on public.flashcards (user_id, due_date);

create trigger set_flashcards_updated_at
  before update on public.flashcards
  for each row execute function public.set_updated_at();

alter table public.flashcards enable row level security;

create policy "Users can view their own flashcards"
  on public.flashcards for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can create their own flashcards"
  on public.flashcards for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users can update their own flashcards"
  on public.flashcards for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users can delete their own flashcards"
  on public.flashcards for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- One immutable row per graded review — backs the review-history heatmap and
-- the flashcard-review XP count. Never updated or deleted by the app.
create table public.flashcard_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  flashcard_id uuid not null references public.flashcards (id) on delete cascade,
  quality smallint not null check (quality between 0 and 5),
  reviewed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

comment on table public.flashcard_reviews is 'Matches src/lib/types/flashcard.ts FlashcardReview. Append-only.';

create index idx_flashcard_reviews_user_reviewed on public.flashcard_reviews (user_id, reviewed_at desc);
create index idx_flashcard_reviews_flashcard on public.flashcard_reviews (flashcard_id);

alter table public.flashcard_reviews enable row level security;

create policy "Users can view their own flashcard reviews"
  on public.flashcard_reviews for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can create their own flashcard reviews"
  on public.flashcard_reviews for insert
  to authenticated
  with check (user_id = (select auth.uid()));
