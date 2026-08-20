import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/common";
import type { Class, ClassFilters, ClassWithRelations } from "@/lib/types/class";
import type { SubjectIcon } from "@/lib/types/subject";
import type { Database } from "@/lib/types/database";
import { ensureClassesForUser } from "./classes.generate";
import { createClass, deleteClass, updateClass } from "./classes.mutations";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type ClassRow = Database["public"]["Tables"]["classes"]["Row"];

interface SubjectSummary {
  name: string;
  color: string;
  icon: SubjectIcon;
}

function mapClassRow(row: ClassRow): Class {
  return {
    id: row.id,
    userId: row.user_id,
    subjectId: row.subject_id,
    classScheduleId: row.class_schedule_id,
    date: row.date,
    startTime: row.start_time,
    durationMinutes: row.duration_minutes,
    teacher: row.teacher,
    location: row.location,
    attendanceStatus: row.attendance_status as Class["attendanceStatus"],
    examStatus: row.exam_status as Class["examStatus"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function withSubject(
  klass: Class,
  subjectsById: Map<string, SubjectSummary>,
): ClassWithRelations {
  const subject = subjectsById.get(klass.subjectId);
  return {
    ...klass,
    subjectName: subject?.name ?? "Unknown subject",
    subjectColor: subject?.color ?? "#94a3b8",
    subjectIcon: subject?.icon ?? "book-open",
  };
}

/** Fetches the subjects a set of classes belong to in one bulk query — no N+1s. */
async function fetchSubjectsByIds(
  supabase: SupabaseServerClient,
  subjectIds: string[],
): Promise<Map<string, SubjectSummary>> {
  if (subjectIds.length === 0) return new Map();

  const { data: rows } = await supabase
    .from("subjects")
    .select("id, name, color, icon")
    .in("id", subjectIds);

  return new Map(
    (rows ?? []).map((row) => [
      row.id,
      { name: row.name, color: row.color, icon: row.icon as SubjectIcon },
    ]),
  );
}

/** SSR-facing surface for `Actions.Classes.*`. Mutations re-export the real Server Actions. */
export const classesActions = {
  async getAll(filters?: ClassFilters): Promise<ActionResult<ClassWithRelations[]>> {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return { data: [], error: null };
    }

    await ensureClassesForUser(supabase, authData.user.id);

    let query = supabase.from("classes").select("*").eq("user_id", authData.user.id);

    if (filters?.subjectId) query = query.eq("subject_id", filters.subjectId);
    if (filters?.attendanceStatus) query = query.eq("attendance_status", filters.attendanceStatus);
    if (filters?.examStatus) query = query.eq("exam_status", filters.examStatus);
    if (filters?.teacher) query = query.ilike("teacher", `%${filters.teacher}%`);
    if (filters?.dateFrom) query = query.gte("date", filters.dateFrom);
    if (filters?.dateTo) query = query.lte("date", filters.dateTo);

    const { data: rows, error } = await query
      .order("date", { ascending: false })
      .order("start_time", { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }

    const classes = (rows ?? []).map(mapClassRow);
    if (classes.length === 0) {
      return { data: [], error: null };
    }

    const subjectsById = await fetchSubjectsByIds(
      supabase,
      [...new Set(classes.map((klass) => klass.subjectId))],
    );

    return {
      data: classes.map((klass) => withSubject(klass, subjectsById)),
      error: null,
    };
  },

  async getById(id: string): Promise<ActionResult<ClassWithRelations>> {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return { data: null, error: null };
    }

    const { data: row, error } = await supabase
      .from("classes")
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

    const klass = mapClassRow(row);
    const subjectsById = await fetchSubjectsByIds(supabase, [klass.subjectId]);

    return {
      data: withSubject(klass, subjectsById),
      error: null,
    };
  },

  create: createClass,
  update: updateClass,
  remove: deleteClass,
};
