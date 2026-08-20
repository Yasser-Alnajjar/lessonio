import "server-only";

import { addDays, localIsoDate } from "@/lib/notifications/dates";
import type { createClient } from "@/lib/supabase/server";
import type { ClassScheduleEntry } from "@/lib/types/class-schedule";
import type { Database } from "@/lib/types/database";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type ClassInsert = Database["public"]["Tables"]["classes"]["Insert"];

/** Occurrences are materialized this many days into the past and future of "today". */
const WINDOW_DAYS = 30;
/** How stale a user's materialized classes may get before the next read regenerates them. */
const REFRESH_INTERVAL_MS = 15 * 60 * 1000;

/**
 * Materializes `classes` occurrence rows for the signed-in user from their
 * active `class_schedules` templates, for a window of `today` +/- WINDOW_DAYS.
 *
 * Mirrors `ensureNotificationsForUser()` in `src/actions/notifications.generate.ts`:
 * every read path calls this first, so a user who opens the app gets
 * occurrences materialized from their own schedules, and a user who never
 * opens it costs nothing. The compare-and-set claim on
 * `settings.classes_materialized_at` keeps repeat calls (e.g. dashboard +
 * calendar + classes list, all on one page load) cheap.
 */
export async function ensureClassesForUser(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<void> {
  try {
    const claim = await claimRun(supabase, userId);
    if (!claim) return;

    await materializeClasses(supabase, userId, claim.timezone);
  } catch {
    // Deliberately swallowed, same as ensureNotificationsForUser(): the
    // stamp is already set, so the next attempt is one refresh interval
    // away rather than on the very next read.
  }
}

/**
 * Decides whether this request is the one that regenerates, and returns the
 * user's timezone if so. The update filters on the stamp still being stale,
 * making it a compare-and-set: of two requests racing on the same user, only
 * one update matches a row and the other gets nothing back.
 */
async function claimRun(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<{ timezone: string | null } | null> {
  const cutoffMs = Date.now() - REFRESH_INTERVAL_MS;
  const cutoff = new Date(cutoffMs).toISOString();

  const { data: settings } = await supabase
    .from("settings")
    .select("classes_materialized_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (!settings) return null;

  const lastRun = settings.classes_materialized_at;

  // Compared as instants rather than strings — see claimRun() in
  // notifications.generate.ts for why toISOString() can't be compared
  // lexicographically against Postgres's timestamptz rendering.
  if (lastRun !== null && Date.parse(lastRun) > cutoffMs) return null;

  const { data: claimed } = await supabase
    .from("settings")
    .update({ classes_materialized_at: new Date().toISOString() })
    .eq("user_id", userId)
    .or(`classes_materialized_at.is.null,classes_materialized_at.lt.${cutoff}`)
    .select("user_id")
    .maybeSingle();

  if (!claimed) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", userId)
    .maybeSingle();

  return { timezone: profile?.timezone ?? null };
}

/**
 * Walks every active schedule's per-day entries over the window and upserts
 * one `classes` row per matching (schedule, date). `attendance_status` is
 * left NULL; teacher/location/duration/start_time are copied from the
 * template at materialization time so a later template edit doesn't
 * silently rewrite history for occurrences that already exist.
 */
async function materializeClasses(
  supabase: SupabaseServerClient,
  userId: string,
  timezone: string | null,
): Promise<void> {
  const today = localIsoDate(new Date(), timezone);
  const windowStart = addDays(today, -WINDOW_DAYS);
  const windowEnd = addDays(today, WINDOW_DAYS);

  const { data: scheduleRows } = await supabase
    .from("class_schedules")
    .select("id, subject_id, teacher, location, schedules, starts_on, ends_on")
    .eq("user_id", userId)
    .eq("is_active", true)
    .lte("starts_on", windowEnd);

  const schedules = scheduleRows ?? [];
  if (schedules.length === 0) return;

  const rows: ClassInsert[] = [];

  for (const schedule of schedules) {
    const rangeStart = schedule.starts_on > windowStart ? schedule.starts_on : windowStart;
    const rangeEnd =
      schedule.ends_on && schedule.ends_on < windowEnd ? schedule.ends_on : windowEnd;
    if (rangeStart > rangeEnd) continue;

    // The `class_schedules_schedules_valid` DB constraint guarantees this
    // JSONB column already holds well-formed ClassScheduleEntry objects —
    // same cast as mapClassScheduleRow() in class-schedules.ts.
    const entries = schedule.schedules as unknown as ClassScheduleEntry[];

    // ISO `yyyy-mm-dd` strings sort and compare lexicographically like the
    // dates they represent, so this loop can walk the range as strings.
    for (let date = rangeStart; date <= rangeEnd; date = addDays(date, 1)) {
      const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
      const entry = entries.find((candidate) => candidate.dayOfWeek === weekday);
      if (!entry) continue;

      rows.push({
        user_id: userId,
        subject_id: schedule.subject_id,
        class_schedule_id: schedule.id,
        date,
        start_time: entry.startTime,
        duration_minutes: entry.durationMinutes,
        teacher: schedule.teacher,
        location: schedule.location,
      });
    }
  }

  if (rows.length === 0) return;

  // `ignoreDuplicates` turns this into ON CONFLICT DO NOTHING against
  // idx_classes_schedule_occurrence, so re-running over unchanged schedules
  // creates nothing — existing occurrences (including recorded attendance)
  // are left untouched.
  await supabase
    .from("classes")
    .upsert(rows, { onConflict: "class_schedule_id,date", ignoreDuplicates: true });
}

/**
 * Called after a `class_schedules` template is edited or deactivated (and
 * before it's deleted): removes the *future, untouched* occurrences that
 * template generated, so the next `ensureClassesForUser()` re-materializes
 * them from the new template shape. An occurrence counts as untouched only
 * when nothing has been recorded against it — attendance still unset, no
 * exam status, and no lesson linked back to it — so a class the student
 * already marked attended (or tied a lesson to) is never silently deleted.
 * Past occurrences are never touched, recorded or not.
 */
export async function deleteFutureUntouchedOccurrences(
  supabase: SupabaseServerClient,
  scheduleId: string,
): Promise<void> {
  const todayIso = new Date().toISOString().slice(0, 10);

  const { data: candidates } = await supabase
    .from("classes")
    .select("id")
    .eq("class_schedule_id", scheduleId)
    .gt("date", todayIso)
    .is("attendance_status", null)
    .eq("exam_status", "none");

  const candidateIds = (candidates ?? []).map((row) => row.id);
  if (candidateIds.length === 0) return;

  const { data: linkedRows } = await supabase
    .from("lessons")
    .select("class_id")
    .in("class_id", candidateIds);

  const linkedIds = new Set((linkedRows ?? []).map((row) => row.class_id));
  const deletableIds = candidateIds.filter((id) => !linkedIds.has(id));
  if (deletableIds.length === 0) return;

  await supabase.from("classes").delete().in("id", deletableIds);
}
