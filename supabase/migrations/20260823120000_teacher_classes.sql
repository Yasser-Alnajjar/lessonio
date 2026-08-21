-- ---------------------------------------------------------------------------
-- Phase 2 of plans/adding-teachers-to-lessonio.md: teacher classes, join
-- codes, and roster (enrollments). See that file for the full design.
--
-- Permanent scope statement:
-- A teacher can see: their own teacher_classes and class_join_codes;
-- class_enrollments for those classes; full_name/avatar_url of students
-- enrolled in them (via the one additive policy on public.profiles below).
-- Nothing in this migration adds a policy to lessons, lesson_notes,
-- attachments, flashcards, study_sessions, homework, exams, subjects,
-- classes, class_occurrences, goals, user_achievements, notifications,
-- settings, or tags — those keep their untouched
-- `user_id = (select auth.uid())` predicates. A teacher only ever sees what
-- a student explicitly submitted to that teacher's assignment (Phase 4).
--
-- A student's access to teacher-owned data is determined solely by their
-- own class_enrollments rows. A student with zero enrollments matches zero
-- teacher-owned rows.
-- ---------------------------------------------------------------------------

create table public.teacher_classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  subject_label text,
  description text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.teacher_classes is
  'A teacher''s class. Deliberately its own table, not an extension of '
  'public.classes: classes.subject_id is NOT NULL -> student-owned subjects, '
  'meetings JSONB is NOT NULL and feeds ensureClassOccurrencesForUser() and '
  'sync_user_achievements() for every classes row a user has. A teacher row '
  'there would poison all three. public.classes is untouched by this '
  'migration and every later phase.';

comment on column public.teacher_classes.subject_label is
  'Free text, not a FK to public.subjects — that table is student-owned.';

create index idx_teacher_classes_teacher on public.teacher_classes (teacher_id);

create trigger set_teacher_classes_updated_at
  before update on public.teacher_classes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
create table public.class_join_codes (
  teacher_class_id uuid primary key references public.teacher_classes (id) on delete cascade,
  code text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  rotated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.class_join_codes is
  'One join code per class, in its own table rather than a column on '
  'teacher_classes: Postgres has no column-level RLS, so if the code sat on '
  'teacher_classes every enrolled student could read it, making rotation '
  'after a leak pointless. No INSERT policy below — rows come only from '
  'create_teacher_class()/rotate_join_code().';

create trigger set_class_join_codes_updated_at
  before update on public.class_join_codes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
create table public.class_enrollments (
  id uuid primary key default gen_random_uuid(),
  teacher_class_id uuid not null references public.teacher_classes (id) on delete cascade,
  student_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'removed')),
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (teacher_class_id, student_id)
);

comment on table public.class_enrollments is
  'A student''s membership in a teacher''s class. status=''removed'' rather '
  'than deleting the row: a removed/left enrollment must not take '
  'assignment_submissions (Phase 4) down with it, and re-joining the same '
  'class code must be idempotent. No INSERT/DELETE policy below — rows come '
  'only from join_class_by_code()/leave_class(); UPDATE is teacher-only '
  '(remove/restore), enforced alongside enforce_enrollment_pin() below so a '
  'status change can never smuggle in a different teacher_class_id/student_id.';

create index idx_class_enrollments_class on public.class_enrollments (teacher_class_id);
create index idx_class_enrollments_student on public.class_enrollments (student_id);

create trigger set_class_enrollments_updated_at
  before update on public.class_enrollments
  for each row execute function public.set_updated_at();

create or replace function public.enforce_enrollment_pin()
returns trigger
language plpgsql
as $$
begin
  if new.teacher_class_id is distinct from old.teacher_class_id
    or new.student_id is distinct from old.student_id then
    raise exception 'teacher_class_id and student_id are immutable on class_enrollments'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

comment on function public.enforce_enrollment_pin() is
  'BEFORE UPDATE guard: the class_enrollments UPDATE policy is teacher-only '
  'for remove/restore, but has no column scope — this stops a teacher (or '
  'the join_class_by_code()/leave_class() RPCs) from moving an enrollment '
  'row to a different class or student mid-update.';

create trigger enforce_enrollment_pin
  before update on public.class_enrollments
  for each row execute function public.enforce_enrollment_pin();

-- ---------------------------------------------------------------------------
-- Anti-recursion helpers. teacher_classes.SELECT must be visible to enrolled
-- students -> consults class_enrollments; class_enrollments.SELECT must be
-- visible to the owning teacher -> consults teacher_classes. As inline
-- subqueries each policy would re-enter the other and Postgres raises 42P17
-- infinite recursion. SECURITY DEFINER runs as the owner and skips RLS,
-- breaking the cycle. Every cross-table predicate in this feature goes
-- through one of these — never an inline subquery.
-- ---------------------------------------------------------------------------
create or replace function public.is_teacher_of_class(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.teacher_classes
    where id = p_class_id and teacher_id = auth.uid()
  );
$$;

create or replace function public.is_enrolled_in_class(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.class_enrollments
    where teacher_class_id = p_class_id
      and student_id = auth.uid()
      and status = 'active'
  );
$$;

create or replace function public.shares_teacher_class_with(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    -- caller teaches a class p_profile_id is actively enrolled in
    select 1
    from public.teacher_classes tc
    join public.class_enrollments ce on ce.teacher_class_id = tc.id
    where tc.teacher_id = auth.uid()
      and ce.student_id = p_profile_id
      and ce.status = 'active'
  ) or exists (
    -- caller is actively enrolled in a class p_profile_id teaches
    select 1
    from public.class_enrollments ce
    join public.teacher_classes tc on tc.id = ce.teacher_class_id
    where ce.student_id = auth.uid()
      and tc.teacher_id = p_profile_id
      and ce.status = 'active'
  );
$$;

comment on function public.shares_teacher_class_with(uuid) is
  'True if the caller and p_profile_id are on opposite ends of the same '
  'active enrollment — teacher viewing a student''s name/avatar on the '
  'roster, or a student viewing their teacher''s name/avatar. Deliberately '
  'not transitive to a co-student: two students in the same class do not '
  'share a class "with each other" under this predicate.';

revoke execute on function public.is_teacher_of_class(uuid) from public, anon;
revoke execute on function public.is_enrolled_in_class(uuid) from public, anon;
revoke execute on function public.shares_teacher_class_with(uuid) from public, anon;
grant execute on function public.is_teacher_of_class(uuid) to authenticated;
grant execute on function public.is_enrolled_in_class(uuid) to authenticated;
grant execute on function public.shares_teacher_class_with(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Join codes: alphabet excludes I/L/O/0/1 to avoid visual ambiguity when a
-- teacher reads a code aloud or writes it on a whiteboard. 31 chars, 6-char
-- codes ~= 887M combinations. generate_join_code() only checks-then-returns
-- a candidate (not check-and-insert), so the SELECT/INSERT gap is not
-- atomic — every caller below re-generates and retries once on the unique
-- constraint's unique_violation rather than trusting this check alone.
-- ---------------------------------------------------------------------------
create or replace function public.generate_join_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  candidate text;
  attempt int;
begin
  for attempt in 1..10 loop
    select string_agg(substr(alphabet, (floor(random() * length(alphabet)) + 1)::int, 1), '')
    into candidate
    from generate_series(1, 6);

    if not exists (select 1 from public.class_join_codes where code = candidate) then
      return candidate;
    end if;
  end loop;

  raise exception 'could not generate a unique join code after % attempts', attempt;
end;
$$;

revoke execute on function public.generate_join_code() from public, anon, authenticated;

create or replace function public.create_teacher_class(
  p_name text,
  p_subject_label text default null,
  p_description text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_class_id uuid;
  v_code text;
  v_attempt int := 0;
begin
  if auth.uid() is null then
    raise exception 'create_teacher_class requires an authenticated user';
  end if;

  if public.current_app_role() <> 'teacher' then
    raise exception 'only teachers can create classes' using errcode = '42501';
  end if;

  insert into public.teacher_classes (teacher_id, name, subject_label, description)
  values (auth.uid(), p_name, p_subject_label, p_description)
  returning id into v_class_id;

  loop
    v_attempt := v_attempt + 1;
    v_code := public.generate_join_code();
    begin
      insert into public.class_join_codes (teacher_class_id, code)
      values (v_class_id, v_code);
      exit;
    exception when unique_violation then
      if v_attempt >= 2 then
        raise;
      end if;
    end;
  end loop;

  return v_class_id;
end;
$$;

comment on function public.create_teacher_class(text, text, text) is
  'Inserts the class and its join code in one transaction so a class never '
  'exists without a code, or vice versa.';

revoke execute on function public.create_teacher_class(text, text, text) from public, anon;
grant execute on function public.create_teacher_class(text, text, text) to authenticated;

create or replace function public.rotate_join_code(p_class_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_attempt int := 0;
begin
  if auth.uid() is null then
    raise exception 'rotate_join_code requires an authenticated user';
  end if;

  if not public.is_teacher_of_class(p_class_id) then
    raise exception 'only the owning teacher can rotate this join code' using errcode = '42501';
  end if;

  loop
    v_attempt := v_attempt + 1;
    v_code := public.generate_join_code();
    begin
      update public.class_join_codes
      set code = v_code, rotated_at = now()
      where teacher_class_id = p_class_id;
      exit;
    exception when unique_violation then
      if v_attempt >= 2 then
        raise;
      end if;
    end;
  end loop;

  return v_code;
end;
$$;

revoke execute on function public.rotate_join_code(uuid) from public, anon;
grant execute on function public.rotate_join_code(uuid) to authenticated;

create or replace function public.join_class_by_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_class_id uuid;
  v_normalized text;
begin
  if auth.uid() is null then
    raise exception 'join_class_by_code requires an authenticated user';
  end if;

  if public.current_app_role() <> 'student' then
    raise exception 'only students can join a class' using errcode = '42501';
  end if;

  v_normalized := upper(regexp_replace(p_code, '[^A-Za-z0-9]', '', 'g'));

  select teacher_class_id into v_class_id
  from public.class_join_codes
  where code = v_normalized;

  if v_class_id is null then
    raise exception 'invalid_join_code' using errcode = 'P0001';
  end if;

  -- Re-joining after leaving is idempotent: the unique (teacher_class_id,
  -- student_id) index makes this an upsert rather than a second row.
  insert into public.class_enrollments (teacher_class_id, student_id, status)
  values (v_class_id, auth.uid(), 'active')
  on conflict (teacher_class_id, student_id)
  do update set status = 'active';

  return v_class_id;
end;
$$;

revoke execute on function public.join_class_by_code(text) from public, anon;
grant execute on function public.join_class_by_code(text) to authenticated;

create or replace function public.leave_class(p_class_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'leave_class requires an authenticated user';
  end if;

  update public.class_enrollments
  set status = 'removed'
  where teacher_class_id = p_class_id and student_id = auth.uid();

  if not found then
    raise exception 'not enrolled in this class' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function public.leave_class(uuid) from public, anon;
grant execute on function public.leave_class(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.teacher_classes enable row level security;

create policy "Teachers and their enrolled students can view a class"
  on public.teacher_classes for select
  to authenticated
  using (teacher_id = (select auth.uid()) or public.is_enrolled_in_class(id));

create policy "Teachers can create their own classes"
  on public.teacher_classes for insert
  to authenticated
  with check (
    teacher_id = (select auth.uid())
    and public.current_app_role() = 'teacher'
  );

create policy "Teachers can update their own classes"
  on public.teacher_classes for update
  to authenticated
  using (teacher_id = (select auth.uid()))
  with check (teacher_id = (select auth.uid()));

create policy "Teachers can delete their own classes"
  on public.teacher_classes for delete
  to authenticated
  using (teacher_id = (select auth.uid()));

alter table public.class_join_codes enable row level security;

create policy "The owning teacher can view their join code"
  on public.class_join_codes for select
  to authenticated
  using (public.is_teacher_of_class(teacher_class_id));

create policy "The owning teacher can update their join code"
  on public.class_join_codes for update
  to authenticated
  using (public.is_teacher_of_class(teacher_class_id))
  with check (public.is_teacher_of_class(teacher_class_id));

create policy "The owning teacher can delete their join code"
  on public.class_join_codes for delete
  to authenticated
  using (public.is_teacher_of_class(teacher_class_id));

alter table public.class_enrollments enable row level security;

create policy "Students and the owning teacher can view an enrollment"
  on public.class_enrollments for select
  to authenticated
  using (
    student_id = (select auth.uid())
    or public.is_teacher_of_class(teacher_class_id)
  );

create policy "The owning teacher can update an enrollment"
  on public.class_enrollments for update
  to authenticated
  using (public.is_teacher_of_class(teacher_class_id))
  with check (public.is_teacher_of_class(teacher_class_id));

-- ---------------------------------------------------------------------------
-- The single deliberate cross-user read added by this feature: a teacher
-- reading a student's display name/avatar for the roster, and a student
-- reading their teacher's. Every other table keeps its untouched
-- `user_id = (select auth.uid())` policies.
-- ---------------------------------------------------------------------------
create policy "Users can view profiles they share a class with"
  on public.profiles for select
  to authenticated
  using (public.shares_teacher_class_with(id));
