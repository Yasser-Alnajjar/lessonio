import "server-only";

import { addDays, localIsoDate } from "@/lib/notifications/dates";
import type { createClient } from "@/lib/supabase/server";
import type { ClassMeeting } from "@/lib/types/class";
import type { Database } from "@/lib/types/database";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type ClassOccurrenceInsert =
  Database["public"]["Tables"]["class_occurrences"]["Insert"];

/** Occurrences are materialized this many days into the past and future of "today". */
const WINDOW_DAYS = 30;
/** How stale a user's materialized occurrences may get before the next read regenerates them. */
const REFRESH_INTERVAL_MS = 15 * 60 * 1000;

/**
 * Materializes `class_occurrences` rows for the signed-in user from their
 * active `classes`, for a window of `today` +/- WINDOW_DAYS.
 *
 * A class recurs every week for as long as it exists, so the window is the
 * only bound here — the student never creates next week's occurrence by
 * hand, and there is no start or end date to clamp against.
 *
 * Mirrors `ensureNotificationsForUser()` in `src/actions/notifications.generate.ts`:
 * every read path calls this first, so a user who opens the app gets
 * occurrences materialized from their own classes, and a user who never
 * opens it costs nothing. The compare-and-set claim on
 * `settings.class_occurrences_materialized_at` keeps repeat calls (e.g.
 * dashboard + calendar + classes list, all on one page load) cheap.
 */
export async function ensureClassOccurrencesForUser(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<void> {
  try {
    const claim = await claimRun(supabase, userId);
    if (!claim) return;

    await materializeOccurrences(supabase, userId, claim.timezone);
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
    .select("class_occurrences_materialized_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (!settings) return null;

  const lastRun = settings.class_occurrences_materialized_at;

  // Compared as instants rather than strings — see claimRun() in
  // notifications.generate.ts for why toISOString() can't be compared
  // lexicographically against Postgres's timestamptz rendering.
  if (lastRun !== null && Date.parse(lastRun) > cutoffMs) return null;

  const { data: claimed } = await supabase
    .from("settings")
    .update({ class_occurrences_materialized_at: new Date().toISOString() })
    .eq("user_id", userId)
    .or(
      `class_occurrences_materialized_at.is.null,class_occurrences_materialized_at.lt.${cutoff}`,
    )
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
 * Walks every active class's weekly meetings over the window and upserts one
 * occurrence per matching (class, date). `attendance_status` is left NULL, so
 * every new occurrence starts unrecorded rather than inheriting last week's.
 * `start_time`/`duration_minutes` are copied from the meeting at
 * materialization time so a later edit to the class doesn't silently rewrite
 * the timing of occurrences that already exist.
 */
async function materializeOccurrences(
  supabase: SupabaseServerClient,
  userId: string,
  timezone: string | null,
): Promise<void> {
  const today = localIsoDate(new Date(), timezone);
  const windowStart = addDays(today, -WINDOW_DAYS);
  const windowEnd = addDays(today, WINDOW_DAYS);

  const { data: classRows } = await supabase
    .from("classes")
    .select("id, subject_id, meetings")
    .eq("user_id", userId)
    .eq("is_active", true);

  const classes = classRows ?? [];
  if (classes.length === 0) return;

  const rows: ClassOccurrenceInsert[] = [];

  for (const klass of classes) {
    // The `classes_meetings_valid` DB constraint guarantees this JSONB
    // column already holds well-formed ClassMeeting objects — same cast as
    // mapClassRow() in classes.ts.
    const meetings = klass.meetings as unknown as ClassMeeting[];

    // ISO `yyyy-mm-dd` strings sort and compare lexicographically like the
    // dates they represent, so this loop can walk the range as strings.
    for (let date = windowStart; date <= windowEnd; date = addDays(date, 1)) {
      const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
      const meeting = meetings.find((candidate) => candidate.dayOfWeek === weekday);
      if (!meeting) continue;

      rows.push({
        user_id: userId,
        subject_id: klass.subject_id,
        class_id: klass.id,
        date,
        start_time: meeting.startTime,
        duration_minutes: meeting.durationMinutes,
      });
    }
  }

  if (rows.length === 0) return;

  // `ignoreDuplicates` turns this into ON CONFLICT DO NOTHING against
  // idx_class_occurrences_class_date, so re-running over unchanged classes
  // creates nothing — existing occurrences (including recorded attendance)
  // are left untouched.
  await supabase
    .from("class_occurrences")
    .upsert(rows, { onConflict: "class_id,date", ignoreDuplicates: true });
}

/**
 * Called after a class is created, edited, or reactivated: clears the
 * materialization stamp so the next `ensureClassOccurrencesForUser()` call
 * (typically the very next page load, right after `revalidatePath`) actually
 * regenerates occurrences instead of being skipped by the 15-minute
 * `REFRESH_INTERVAL_MS` cooldown in `claimRun()` — otherwise a class created
 * shortly after any page in the app materialized occurrences (even with zero
 * classes at the time) sits with no occurrences, including today's, until
 * the cooldown expires on its own.
 */
export async function resetClassOccurrencesMaterializedAt(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<void> {
  await supabase
    .from("settings")
    .update({ class_occurrences_materialized_at: null })
    .eq("user_id", userId);
}

/**
 * Called after a class is edited or deactivated: removes the *today-or-later,
 * untouched* occurrences it generated, so the next
 * `ensureClassOccurrencesForUser()` re-materializes them from the new shape.
 * An occurrence counts as untouched only when nothing has been recorded
 * against it — attendance still unset, no exam status, and no lesson linked
 * back to it — so a class the student already marked attended (or tied a
 * lesson to) is never silently deleted. Today is included (not just strictly
 * future dates): `start_time`/`duration_minutes`/`subject_id` are snapshotted
 * onto the occurrence at materialization time, so without this, editing a
 * class today leaves its still-untouched "Today" card showing the old
 * values until the day rolls over. Strictly-past occurrences are never
 * touched, recorded or not.
 *
 * Deleting a class needs no call here: the occurrences cascade with it.
 */
export async function deleteFutureUntouchedOccurrences(
  supabase: SupabaseServerClient,
  classId: string,
): Promise<void> {
  const todayIso = new Date().toISOString().slice(0, 10);

  const { data: candidates } = await supabase
    .from("class_occurrences")
    .select("id")
    .eq("class_id", classId)
    .gte("date", todayIso)
    .is("attendance_status", null)
    .eq("exam_status", "none");

  const candidateIds = (candidates ?? []).map((row) => row.id);
  if (candidateIds.length === 0) return;

  const { data: linkedRows } = await supabase
    .from("lessons")
    .select("class_occurrence_id")
    .in("class_occurrence_id", candidateIds);

  const linkedIds = new Set((linkedRows ?? []).map((row) => row.class_occurrence_id));
  const deletableIds = candidateIds.filter((id) => !linkedIds.has(id));
  if (deletableIds.length === 0) return;

  await supabase.from("class_occurrences").delete().in("id", deletableIds);
}
