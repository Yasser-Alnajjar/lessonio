import "server-only";

import { format, parseISO, startOfWeek } from "date-fns";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/common";
import type { Database } from "@/lib/types/database";
import type {
  StudySession,
  StudySessionSummary,
  StudySessionWithRelations,
} from "@/lib/types/study-session";
import {
  cancelStudySession,
  deleteStudySession,
  logManualSession,
  startStudySession,
  stopStudySession,
} from "./study-sessions.mutations";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type StudySessionRow = Database["public"]["Tables"]["study_sessions"]["Row"];

const EMPTY_SUMMARY: StudySessionSummary = {
  totalMinutesThisWeek: 0,
  totalMinutesToday: 0,
  averageSessionMinutes: 0,
  sessionsThisWeek: 0,
};

function mapSessionRow(
  row: StudySessionRow,
  subjects: Map<string, { name: string; color: string }>,
  lessonTitles: Map<string, string>,
): StudySessionWithRelations {
  const subject = row.subject_id ? subjects.get(row.subject_id) : undefined;

  const session: StudySession = {
    id: row.id,
    userId: row.user_id,
    subjectId: row.subject_id,
    lessonId: row.lesson_id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    durationMinutes: row.duration_minutes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  return {
    ...session,
    subjectName: subject?.name ?? null,
    subjectColor: subject?.color ?? null,
    lessonTitle: row.lesson_id ? (lessonTitles.get(row.lesson_id) ?? null) : null,
  };
}

/** Bulk-fetches subject and lesson relations — no N+1s. Mirrors `attachRelations` in homework.ts. Both ids are nullable here (a session can be freestanding, or survive its subject/lesson being deleted). */
async function attachRelations(
  supabase: SupabaseServerClient,
  rows: StudySessionRow[],
): Promise<StudySessionWithRelations[]> {
  if (rows.length === 0) return [];

  const subjectIds = [...new Set(rows.map((row) => row.subject_id).filter((id) => id !== null))];
  const lessonIds = [...new Set(rows.map((row) => row.lesson_id).filter((id) => id !== null))];

  const [{ data: subjectRows }, { data: lessonRows }] = await Promise.all([
    subjectIds.length > 0
      ? supabase.from("subjects").select("id, name, color").in("id", subjectIds)
      : Promise.resolve({ data: [] as { id: string; name: string; color: string }[] }),
    lessonIds.length > 0
      ? supabase.from("lessons").select("id, title").in("id", lessonIds)
      : Promise.resolve({ data: [] as { id: string; title: string }[] }),
  ]);

  const subjects = new Map(
    (subjectRows ?? []).map((row) => [row.id, { name: row.name, color: row.color }]),
  );
  const lessonTitles = new Map((lessonRows ?? []).map((row) => [row.id, row.title]));

  return rows.map((row) => mapSessionRow(row, subjects, lessonTitles));
}

/** SSR-facing surface for `Actions.StudySessions.*`. Mutations re-export the real Server Actions. */
export const studySessionsActions = {
  async getHistory(): Promise<ActionResult<StudySessionWithRelations[]>> {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return { data: [], error: null };
    }

    const { data: rows, error } = await supabase
      .from("study_sessions")
      .select("*")
      .eq("user_id", authData.user.id)
      .not("ended_at", "is", null)
      .order("started_at", { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }

    const sessions = await attachRelations(supabase, rows ?? []);
    return { data: sessions, error: null };
  },

  /** The single open session (`ended_at is null`), or null. Backs the Start/Stop timer UI. */
  async getRunning(): Promise<ActionResult<StudySessionWithRelations | null>> {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return { data: null, error: null };
    }

    const { data: row, error } = await supabase
      .from("study_sessions")
      .select("*")
      .eq("user_id", authData.user.id)
      .is("ended_at", null)
      .maybeSingle();

    if (error) {
      return { data: null, error: error.message };
    }
    if (!row) {
      return { data: null, error: null };
    }

    const [session] = await attachRelations(supabase, [row]);
    return { data: session ?? null, error: null };
  },

  async getSummary(): Promise<ActionResult<StudySessionSummary>> {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return { data: EMPTY_SUMMARY, error: null };
    }

    const today = new Date();
    const weekStart = startOfWeek(today);
    const todayIso = format(today, "yyyy-MM-dd");

    const { data: rows, error } = await supabase
      .from("study_sessions")
      .select("started_at, duration_minutes")
      .eq("user_id", authData.user.id)
      .not("duration_minutes", "is", null)
      .gte("started_at", weekStart.toISOString());

    if (error) {
      return { data: null, error: error.message };
    }

    const sessions = rows ?? [];
    const totalMinutesThisWeek = sessions.reduce(
      (sum, session) => sum + (session.duration_minutes ?? 0),
      0,
    );
    const totalMinutesToday = sessions
      .filter((session) => format(parseISO(session.started_at), "yyyy-MM-dd") === todayIso)
      .reduce((sum, session) => sum + (session.duration_minutes ?? 0), 0);
    const sessionsThisWeek = sessions.length;
    const averageSessionMinutes =
      sessionsThisWeek > 0 ? Math.round(totalMinutesThisWeek / sessionsThisWeek) : 0;

    return {
      data: { totalMinutesThisWeek, totalMinutesToday, averageSessionMinutes, sessionsThisWeek },
      error: null,
    };
  },

  start: startStudySession,
  stop: stopStudySession,
  cancel: cancelStudySession,
  remove: deleteStudySession,
  logManual: logManualSession,
};
