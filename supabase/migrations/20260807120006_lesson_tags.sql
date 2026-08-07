create table public.lesson_tags (
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (lesson_id, tag_id)
);

comment on table public.lesson_tags is
  'Join table backing Lesson.tagIds in src/lib/types/lesson.ts.';

create index idx_lesson_tags_tag on public.lesson_tags (tag_id);

-- A plain FK can't guarantee the lesson and tag share an owner (there's no
-- composite unique key to hang a composite FK off). Enforce it explicitly
-- so RLS on the two parent tables can't be bypassed by pairing another
-- user's tag onto your own lesson (or vice versa).
create or replace function public.enforce_lesson_tag_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  lesson_owner uuid;
  tag_owner uuid;
begin
  select user_id into lesson_owner from public.lessons where id = new.lesson_id;
  select user_id into tag_owner from public.tags where id = new.tag_id;

  if lesson_owner is null or tag_owner is null or lesson_owner <> tag_owner then
    raise exception 'lesson and tag must belong to the same user';
  end if;

  return new;
end;
$$;

create trigger enforce_lesson_tags_owner
  before insert or update on public.lesson_tags
  for each row execute function public.enforce_lesson_tag_owner();

alter table public.lesson_tags enable row level security;

create policy "Users can view tags on their own lessons"
  on public.lesson_tags for select
  to authenticated
  using (
    exists (
      select 1 from public.lessons
      where lessons.id = lesson_tags.lesson_id
        and lessons.user_id = (select auth.uid())
    )
  );

create policy "Users can tag their own lessons"
  on public.lesson_tags for insert
  to authenticated
  with check (
    exists (
      select 1 from public.lessons
      where lessons.id = lesson_tags.lesson_id
        and lessons.user_id = (select auth.uid())
    )
  );

create policy "Users can untag their own lessons"
  on public.lesson_tags for delete
  to authenticated
  using (
    exists (
      select 1 from public.lessons
      where lessons.id = lesson_tags.lesson_id
        and lessons.user_id = (select auth.uid())
    )
  );
