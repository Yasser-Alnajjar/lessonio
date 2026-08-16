import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/common";
import type {
  ClassSchedule,
  ClassScheduleEntry,
  ClassScheduleWithSubject,
} from "@/lib/types/class-schedule";
import type { SubjectIcon } from "@/lib/types/subject";
import type { Database } from "@/lib/types/database";
import {
  createClassSchedule,
  deleteClassSchedule,
  toggleActiveClassSchedule,
  updateClassSchedule,
} from "./class-schedules.mutations";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type ClassScheduleRow = Database["public"]["Tables"]["class_schedules"]["Row"];

interface SubjectSummary {
  name: string;
  color: string;
  icon: SubjectIcon;
}

function mapClassScheduleRow(row: ClassScheduleRow): ClassSchedule {
  return {
    id: row.id,
    userId: row.user_id,
    subjectId: row.subject_id,
    teacher: row.teacher,
    location: row.location,
    // The `class_schedules_schedules_valid` DB constraint guarantees this
    // JSONB column already holds well-formed ClassScheduleEntry objects.
    schedules: row.schedules as unknown as ClassScheduleEntry[],
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function withSubject(
  schedule: ClassSchedule,
  subjectsById: Map<string, SubjectSummary>,
): ClassScheduleWithSubject {
  const subject = subjectsById.get(schedule.subjectId);
  return {
    ...schedule,
    subjectName: subject?.name ?? "Unknown subject",
    subjectColor: subject?.color ?? "#94a3b8",
    subjectIcon: subject?.icon ?? "book-open",
  };
}

/** Fetches the subjects a set of class schedules belong to in one bulk query — no N+1s. */
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

/**
 * SSR-facing surface for `Actions.ClassSchedules.*`. `getAll`/`getById` are
 * plain SSR-only reads; the mutations are re-exported references to the
 * real Server Actions defined in `class-schedules.mutations.ts` (imported
 * directly by Client Components — see that file's header comment for why).
 */
export const classSchedulesActions = {
  async getAll(): Promise<ActionResult<ClassScheduleWithSubject[]>> {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return { data: [], error: null };
    }

    const { data: rows, error } = await supabase
      .from("class_schedules")
      .select("*")
      .eq("user_id", authData.user.id)
      .order("created_at", { ascending: true });

    if (error) {
      return { data: null, error: error.message };
    }

    const schedules = (rows ?? []).map(mapClassScheduleRow);
    if (schedules.length === 0) {
      return { data: [], error: null };
    }

    const subjectsById = await fetchSubjectsByIds(
      supabase,
      [...new Set(schedules.map((schedule) => schedule.subjectId))],
    );

    return {
      data: schedules.map((schedule) => withSubject(schedule, subjectsById)),
      error: null,
    };
  },

  async getById(id: string): Promise<ActionResult<ClassScheduleWithSubject>> {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return { data: null, error: null };
    }

    const { data: row, error } = await supabase
      .from("class_schedules")
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

    const schedule = mapClassScheduleRow(row);
    const subjectsById = await fetchSubjectsByIds(supabase, [schedule.subjectId]);

    return {
      data: withSubject(schedule, subjectsById),
      error: null,
    };
  },

  create: createClassSchedule,
  update: updateClassSchedule,
  toggleActive: toggleActiveClassSchedule,
  remove: deleteClassSchedule,
};
