import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/common";
import type { Exam, ExamWithRelations } from "@/lib/types/exam";
import type { Database } from "@/lib/types/database";
import { createExam, deleteExam, updateExam, updateExamScore } from "./exams.mutations";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type ExamRow = Database["public"]["Tables"]["exams"]["Row"];

function mapExamRow(
  row: ExamRow,
  subjects: Map<string, { name: string; color: string }>,
  lessonTitles: Map<string, string>,
): ExamWithRelations {
  const subject = subjects.get(row.subject_id);

  const exam: Exam = {
    id: row.id,
    userId: row.user_id,
    lessonId: row.lesson_id,
    subjectId: row.subject_id,
    title: row.title,
    date: row.date,
    score: row.score,
    totalScore: row.total_score,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  return {
    ...exam,
    subjectName: subject?.name ?? "Unknown subject",
    subjectColor: subject?.color ?? "#94a3b8",
    lessonTitle: lessonTitles.get(row.lesson_id) ?? "Unknown lesson",
    // Postgres generated column — always in sync with score/total_score.
    percentage: row.percentage,
  };
}

/** Bulk-fetches subject and lesson relations — no N+1s. Mirrors `attachRelations` in lessons.ts. */
async function attachRelations(
  supabase: SupabaseServerClient,
  rows: ExamRow[],
): Promise<ExamWithRelations[]> {
  if (rows.length === 0) return [];

  const subjectIds = [...new Set(rows.map((row) => row.subject_id))];
  const lessonIds = [...new Set(rows.map((row) => row.lesson_id))];

  const [{ data: subjectRows }, { data: lessonRows }] = await Promise.all([
    supabase.from("subjects").select("id, name, color").in("id", subjectIds),
    supabase.from("lessons").select("id, title").in("id", lessonIds),
  ]);

  const subjects = new Map(
    (subjectRows ?? []).map((row) => [row.id, { name: row.name, color: row.color }]),
  );
  const lessonTitles = new Map((lessonRows ?? []).map((row) => [row.id, row.title]));

  return rows.map((row) => mapExamRow(row, subjects, lessonTitles));
}

/** SSR-facing surface for `Actions.Exams.*`. Mutations re-export the real Server Actions. */
export const examsActions = {
  async getAll(): Promise<ActionResult<ExamWithRelations[]>> {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return { data: [], error: null };
    }

    const { data: rows, error } = await supabase
      .from("exams")
      .select("*")
      .eq("user_id", authData.user.id)
      .order("date", { ascending: true });

    if (error) {
      return { data: null, error: error.message };
    }

    const exams = await attachRelations(supabase, rows ?? []);
    return { data: exams, error: null };
  },

  create: createExam,
  update: updateExam,
  updateScore: updateExamScore,
  remove: deleteExam,
};
