import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/common";
import type {
  Subject,
  SubjectIcon,
  SubjectStats,
  SubjectWithStats,
} from "@/lib/types/subject";
import type { Database } from "@/lib/types/database";
import {
  createSubject,
  deleteSubject,
  updateSubject,
} from "./subjects.mutations";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type SubjectRow = Database["public"]["Tables"]["subjects"]["Row"];

function mapSubjectRow(row: SubjectRow): Subject {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    color: row.color,
    icon: row.icon as SubjectIcon,
    isArchived: row.is_archived,
    creditHours: row.credit_hours,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function emptyStats(subjectId: string): SubjectStats {
  return {
    subjectId,
    totalLessons: 0,
    attendanceRate: 0,
    studyRate: 0,
    homeworkProgress: 0,
    totalStudyMinutes: 0,
  };
}

function percentage(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

interface StatsInputRows {
  lessons: Array<{ subject_id: string; study_status: string }>;
  classes: Array<{ subject_id: string; attendance_status: string | null }>;
  homework: Array<{ subject_id: string; completed: boolean }>;
  sessions: Array<{
    subject_id: string | null;
    duration_minutes: number | null;
  }>;
}

/** Aggregates stats per subject in memory — one bulk fetch per table, no N+1 queries. */
function computeStatsBySubject(
  subjectIds: string[],
  rows: StatsInputRows,
): Map<string, SubjectStats> {
  const statsById = new Map<string, SubjectStats>();

  for (const subjectId of subjectIds) {
    const lessons = rows.lessons.filter((row) => row.subject_id === subjectId);
    const recordedClasses = rows.classes.filter(
      (row) => row.subject_id === subjectId && row.attendance_status !== null,
    );
    const homework = rows.homework.filter(
      (row) => row.subject_id === subjectId,
    );
    const totalStudyMinutes = rows.sessions
      .filter((row) => row.subject_id === subjectId)
      .reduce((sum, row) => sum + (row.duration_minutes ?? 0), 0);

    const attended = recordedClasses.filter(
      (row) => row.attendance_status === "attended",
    ).length;
    const studied = lessons.filter(
      (row) =>
        row.study_status === "completed" || row.study_status === "reviewed",
    ).length;
    const completedHomework = homework.filter((row) => row.completed).length;

    statsById.set(subjectId, {
      subjectId,
      totalLessons: lessons.length,
      attendanceRate: percentage(attended, recordedClasses.length),
      studyRate: percentage(studied, lessons.length),
      homeworkProgress: percentage(completedHomework, homework.length),
      totalStudyMinutes,
    });
  }

  return statsById;
}

async function fetchStatsRows(
  supabase: SupabaseServerClient,
  userId: string,
  subjectIds: string[],
): Promise<StatsInputRows> {
  if (subjectIds.length === 0) {
    return { lessons: [], classes: [], homework: [], sessions: [] };
  }

  const [
    { data: lessonRows },
    { data: classRows },
    { data: homeworkRows },
    { data: sessionRows },
  ] = await Promise.all([
    supabase
      .from("lessons")
      .select("subject_id, study_status")
      .eq("user_id", userId)
      .eq("is_archived", false)
      .in("subject_id", subjectIds),
    supabase
      .from("class_occurrences")
      .select("subject_id, attendance_status")
      .eq("user_id", userId)
      .in("subject_id", subjectIds),
    supabase
      .from("homework")
      .select("subject_id, completed")
      .eq("user_id", userId)
      .in("subject_id", subjectIds),
    supabase
      .from("study_sessions")
      .select("subject_id, duration_minutes")
      .eq("user_id", userId)
      .in("subject_id", subjectIds),
  ]);

  return {
    lessons: lessonRows ?? [],
    classes: classRows ?? [],
    homework: homeworkRows ?? [],
    sessions: sessionRows ?? [],
  };
}

/**
 * SSR-facing surface for `Actions.Subjects.*`. `getAll`/`getById` are plain
 * SSR-only reads; the mutations are re-exported references to the real
 * Server Actions defined in `subjects.mutations.ts` (imported directly by
 * Client Components — see that file's header comment for why).
 */
export const subjectsActions = {
  async getAll(): Promise<ActionResult<SubjectWithStats[]>> {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return { data: [], error: null };
    }

    const userId = authData.user.id;

    const { data: subjectRows, error } = await supabase
      .from("subjects")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error) {
      return { data: null, error: error.message };
    }

    const subjects = (subjectRows ?? []).map(mapSubjectRow);
    if (subjects.length === 0) {
      return { data: [], error: null };
    }

    const subjectIds = subjects.map((subject) => subject.id);
    const statsRows = await fetchStatsRows(supabase, userId, subjectIds);
    const statsBySubject = computeStatsBySubject(subjectIds, statsRows);

    return {
      data: subjects.map((subject) => ({
        ...subject,
        stats: statsBySubject.get(subject.id) ?? emptyStats(subject.id),
      })),
      error: null,
    };
  },

  getById: cache(
    async (id: string): Promise<ActionResult<SubjectWithStats>> => {
      const supabase = await createClient();
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        return { data: null, error: null };
      }

      const { data: subjectRow, error } = await supabase
        .from("subjects")
        .select("*")
        .eq("id", id)
        .eq("user_id", authData.user.id)
        .maybeSingle();

      if (error) {
        return { data: null, error: error.message };
      }
      if (!subjectRow) {
        return { data: null, error: null };
      }

      const subject = mapSubjectRow(subjectRow);
      const statsRows = await fetchStatsRows(supabase, authData.user.id, [
        subject.id,
      ]);
      const statsBySubject = computeStatsBySubject([subject.id], statsRows);

      return {
        data: {
          ...subject,
          stats: statsBySubject.get(subject.id) ?? emptyStats(subject.id),
        },
        error: null,
      };
    },
  ),

  create: createSubject,
  update: updateSubject,
  remove: deleteSubject,
};
