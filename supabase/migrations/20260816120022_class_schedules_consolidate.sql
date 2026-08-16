-- Consolidates the per-day schedule back onto a single `class_schedules`
-- row as a `schedules` JSONB array, eliminating the `class_schedule_entries`
-- child table so Class CRUD never needs a join. Each array element still
-- carries its own dayOfWeek/startTime/durationMinutes, so different days can
-- keep different times — only the storage shape changes, not the domain
-- model in src/lib/types/class-schedule.ts.

-- Validates the shape application code relies on: a non-empty array where
-- every element has a 0-6 dayOfWeek (no duplicates within the array), an
-- "HH:mm" startTime, and a positive durationMinutes.
create or replace function public.validate_class_schedule_entries(entries jsonb)
returns boolean
language plpgsql
immutable
as $$
declare
  entry jsonb;
  day int;
  seen_days int[] := array[]::int[];
begin
  if jsonb_typeof(entries) is distinct from 'array' then
    return false;
  end if;
  if jsonb_array_length(entries) = 0 then
    return false;
  end if;

  for entry in select * from jsonb_array_elements(entries)
  loop
    if not (entry ? 'dayOfWeek' and entry ? 'startTime' and entry ? 'durationMinutes') then
      return false;
    end if;

    if jsonb_typeof(entry -> 'dayOfWeek') <> 'number' then
      return false;
    end if;
    day := (entry ->> 'dayOfWeek')::int;
    if day < 0 or day > 6 or day = any(seen_days) then
      return false;
    end if;
    seen_days := array_append(seen_days, day);

    if jsonb_typeof(entry -> 'startTime') <> 'string'
      or (entry ->> 'startTime') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then
      return false;
    end if;

    if jsonb_typeof(entry -> 'durationMinutes') <> 'number'
      or (entry ->> 'durationMinutes')::numeric <= 0 then
      return false;
    end if;
  end loop;

  return true;
end;
$$;

comment on function public.validate_class_schedule_entries(jsonb) is
  'Validates public.class_schedules.schedules: non-empty JSON array of '
  '{dayOfWeek: 0-6 unique, startTime: "HH:mm", durationMinutes: positive}, '
  'matching src/lib/types/class-schedule.ts ClassScheduleEntry.';

alter table public.class_schedules add column schedules jsonb;

-- Backfill from the (about-to-be-dropped) child table, one JSON array per
-- class_schedules row, entries ordered by day for stable output.
update public.class_schedules cs
set schedules = coalesce(
  (
    select jsonb_agg(
      jsonb_build_object(
        'dayOfWeek', e.day_of_week,
        'startTime', to_char(e.start_time, 'HH24:MI'),
        'durationMinutes', e.duration_minutes
      )
      order by e.day_of_week
    )
    from public.class_schedule_entries e
    where e.class_schedule_id = cs.id
  ),
  '[]'::jsonb
);

alter table public.class_schedules
  alter column schedules set not null,
  add constraint class_schedules_schedules_valid
    check (public.validate_class_schedule_entries(schedules));

drop table public.class_schedule_entries;

comment on table public.class_schedules is
  'Matches src/lib/types/class-schedule.ts ClassSchedule. A recurring class '
  'the student attends (when/where) — distinct from lessons, which record '
  'what was studied. `schedules` is a JSONB array of per-day '
  '{dayOfWeek, startTime, durationMinutes} entries — see '
  'validate_class_schedule_entries() for its shape.';
