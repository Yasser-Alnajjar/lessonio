import "server-only";

import { localIsoDate } from "@/lib/notifications/dates";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/common";
import type {
  ClassOccurrence,
  ClassOccurrenceFilters,
  ClassOccurrenceWithRelations,
} from "@/lib/types/class-occurrence";
import type { SubjectIcon } from "@/lib/types/subject";
import type { Database } from "@/lib/types/database";
import { ensureClassOccurrencesForUser } from "./class-occurrences.generate";
import { updateClassOccurrenceStatus } from "./class-occurrences.mutations";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type ClassOccurrenceRow =
  Database["public"]["Tables"]["class_occurrences"]["Row"];

/** How many future occurrences the agenda surfaces beyond today. */
const UPCOMING_LIMIT = 12;

interface SubjectSummary {
  name: string;
  color: string;
  icon: SubjectIcon;
}

interface ClassSummary {
  teacher: string | null;
  location: string | null;
}

export interface ClassAgenda {
  today: ClassOccurrenceWithRelations[];
  upcoming: ClassOccurrenceWithRelations[];
}

function mapClassOccurrenceRow(row: ClassOccurrenceRow): ClassOccurrence {
  return {
    id: row.id,
    userId: row.user_id,
    classId: row.class_id,
    subjectId: row.subject_id,
    date: row.date,
    startTime: row.start_time,
    durationMinutes: row.duration_minutes,
    attendanceStatus:
      row.attendance_status as ClassOccurrence["attendanceStatus"],
    examStatus: row.exam_status as ClassOccurrence["examStatus"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function withRelations(
  occurrence: ClassOccurrence,
  subjectsById: Map<string, SubjectSummary>,
  classesById: Map<string, ClassSummary>,
): ClassOccurrenceWithRelations {
  const subject = subjectsById.get(occurrence.subjectId);
  const klass = classesById.get(occurrence.classId);
  return {
    ...occurrence,
    subjectName: subject?.name ?? "Unknown subject",
    subjectColor: subject?.color ?? "#94a3b8",
    subjectIcon: subject?.icon ?? "book-open",
    // Teacher/location live on the recurring class, not on the occurrence —
    // read through the join rather than duplicated per date.
    teacher: klass?.teacher ?? null,
    location: klass?.location ?? null,
  };
}

/** Bulk-fetches the subjects and classes a set of occurrences belong to — no N+1s. */
async function fetchRelations(
  supabase: SupabaseServerClient,
  occurrences: ClassOccurrence[],
): Promise<{
  subjectsById: Map<string, SubjectSummary>;
  classesById: Map<string, ClassSummary>;
}> {
  const subjectIds = [...new Set(occurrences.map((o) => o.subjectId))];
  const classIds = [...new Set(occurrences.map((o) => o.classId))];

  const [{ data: subjectRows }, { data: classRows }] = await Promise.all([
    subjectIds.length > 0
      ? supabase.from("subjects").select("id, name, color, icon").in("id", subjectIds)
      : Promise.resolve({ data: [] }),
    classIds.length > 0
      ? supabase.from("classes").select("id, teacher, location").in("id", classIds)
      : Promise.resolve({ data: [] }),
  ]);

  return {
    subjectsById: new Map(
      (subjectRows ?? []).map((row) => [
        row.id,
        { name: row.name, color: row.color, icon: row.icon as SubjectIcon },
      ]),
    ),
    classesById: new Map(
      (classRows ?? []).map((row) => [
        row.id,
        { teacher: row.teacher, location: row.location },
      ]),
    ),
  };
}

async function hydrate(
  supabase: SupabaseServerClient,
  rows: ClassOccurrenceRow[],
): Promise<ClassOccurrenceWithRelations[]> {
  const occurrences = rows.map(mapClassOccurrenceRow);
  if (occurrences.length === 0) return [];

  const { subjectsById, classesById } = await fetchRelations(supabase, occurrences);
  return occurrences.map((o) => withRelations(o, subjectsById, classesById));
}

/**
 * SSR-facing surface for `Actions.ClassOccurrences.*` — the dated instances
 * of a recurring `Actions.Classes` entry, and the only place attendance and
 * exam state lives.
 *
 * Every read calls `ensureClassOccurrencesForUser()` first, so a user who
 * opens the app always sees occurrences materialized from their own classes.
 */
export const classOccurrencesActions = {
  async getAll(
    filters?: ClassOccurrenceFilters,
  ): Promise<ActionResult<ClassOccurrenceWithRelations[]>> {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return { data: [], error: null };
    }

    await ensureClassOccurrencesForUser(supabase, authData.user.id);

    let query = supabase
      .from("class_occurrences")
      .select("*")
      .eq("user_id", authData.user.id);

    if (filters?.classId) query = query.eq("class_id", filters.classId);
    if (filters?.subjectId) query = query.eq("subject_id", filters.subjectId);
    if (filters?.attendanceStatus)
      query = query.eq("attendance_status", filters.attendanceStatus);
    if (filters?.examStatus) query = query.eq("exam_status", filters.examStatus);
    if (filters?.dateFrom) query = query.gte("date", filters.dateFrom);
    if (filters?.dateTo) query = query.lte("date", filters.dateTo);

    const { data: rows, error } = await query
      .order("date", { ascending: false })
      .order("start_time", { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: await hydrate(supabase, rows ?? []), error: null };
  },

  async getById(
    id: string,
  ): Promise<ActionResult<ClassOccurrenceWithRelations>> {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return { data: null, error: null };
    }

    const { data: row, error } = await supabase
      .from("class_occurrences")
      .select("*")
      .eq("id", id)
      .eq("user_id", authData.user.id)
      .maybeSingle();

    if (error) {
      return { data: null, error: error.message };
    }
    if (!row) {
      return { data: null, error: null };
    }

    const [hydrated] = await hydrate(supabase, [row]);
    return { data: hydrated ?? null, error: null };
  },

  /**
   * Today's and the next few upcoming occurrences, in chronological order —
   * what the Classes page and the dashboard both show. The two buckets are
   * queried separately so a day packed with classes can never crowd the
   * upcoming list out of a shared row limit.
   */
  async getAgenda(
    upcomingLimit: number = UPCOMING_LIMIT,
  ): Promise<ActionResult<ClassAgenda>> {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return { data: { today: [], upcoming: [] }, error: null };
    }

    const userId = authData.user.id;
    await ensureClassOccurrencesForUser(supabase, userId);

    const { data: profile } = await supabase
      .from("profiles")
      .select("timezone")
      .eq("id", userId)
      .maybeSingle();

    const todayIso = localIsoDate(new Date(), profile?.timezone ?? null);

    const [{ data: todayRows, error: todayError }, { data: upcomingRows, error: upcomingError }] =
      await Promise.all([
        supabase
          .from("class_occurrences")
          .select("*")
          .eq("user_id", userId)
          .eq("date", todayIso)
          .order("start_time", { ascending: true }),
        supabase
          .from("class_occurrences")
          .select("*")
          .eq("user_id", userId)
          .gt("date", todayIso)
          .order("date", { ascending: true })
          .order("start_time", { ascending: true })
          .limit(upcomingLimit),
      ]);

    if (todayError) return { data: null, error: todayError.message };
    if (upcomingError) return { data: null, error: upcomingError.message };

    // Hydrated in one pass so the two buckets share a single subjects/classes
    // lookup instead of issuing it twice.
    const all = await hydrate(supabase, [...(todayRows ?? []), ...(upcomingRows ?? [])]);
    const todayCount = (todayRows ?? []).length;

    return {
      data: {
        today: all.slice(0, todayCount),
        upcoming: all.slice(todayCount),
      },
      error: null,
    };
  },

  updateStatus: updateClassOccurrenceStatus,
};
