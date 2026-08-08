import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/common";
import type { Homework, HomeworkWithRelations } from "@/lib/types/homework";
import type { Database } from "@/lib/types/database";
import {
  createHomework,
  deleteHomework,
  toggleHomeworkCompleted,
  updateHomework,
} from "./homework.mutations";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type HomeworkRow = Database["public"]["Tables"]["homework"]["Row"];

function mapHomeworkRow(
  row: HomeworkRow,
  subjects: Map<string, { name: string; color: string }>,
  lessonTitles: Map<string, string>,
): HomeworkWithRelations {
  const subject = subjects.get(row.subject_id);

  const homework: Homework = {
    id: row.id,
    userId: row.user_id,
    lessonId: row.lesson_id,
    subjectId: row.subject_id,
    title: row.title,
    deadline: row.deadline,
    completed: row.completed,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  return {
    ...homework,
    subjectName: subject?.name ?? "Unknown subject",
    subjectColor: subject?.color ?? "#94a3b8",
    lessonTitle: lessonTitles.get(row.lesson_id) ?? "Unknown lesson",
  };
}

/** Bulk-fetches subject and lesson relations — no N+1s. Mirrors `attachRelations` in lessons.ts. */
async function attachRelations(
  supabase: SupabaseServerClient,
  rows: HomeworkRow[],
): Promise<HomeworkWithRelations[]> {
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

  return rows.map((row) => mapHomeworkRow(row, subjects, lessonTitles));
}

/** SSR-facing surface for `Actions.Homework.*`. Mutations re-export the real Server Actions. */
export const homeworkActions = {
  async getAll(): Promise<ActionResult<HomeworkWithRelations[]>> {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return { data: [], error: null };
    }

    const { data: rows, error } = await supabase
      .from("homework")
      .select("*")
      .eq("user_id", authData.user.id)
      .order("deadline", { ascending: true });

    if (error) {
      return { data: null, error: error.message };
    }

    const homework = await attachRelations(supabase, rows ?? []);
    return { data: homework, error: null };
  },

  create: createHomework,
  update: updateHomework,
  toggleCompleted: toggleHomeworkCompleted,
  remove: deleteHomework,
};
