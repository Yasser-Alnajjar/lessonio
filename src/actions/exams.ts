import "server-only";

import { auth } from "@auth";
import { axios } from "@/lib/client";
import type { ActionResult } from "@/lib/types/common";
import type { ExamWithRelations } from "@/lib/types/exam";
import { createExam, deleteExam, updateExam, updateExamScore } from "./exams.mutations";

/** SSR-facing surface for `Actions.Exams.*`. Mutations re-export the real Server Actions. */
export const examsActions = {
  /**
   * `GET /api/v1/exams` (EXAM-001, soft-empty — API_CONTRACT.md §3.5). The
   * Laravel resource returns `ExamWithRelations` as-is — including
   * `percentage`, which stays a Postgres generated column and is never
   * recomputed client-side — ordered `date DESC`.
   */
  async getAll(): Promise<ActionResult<ExamWithRelations[]>> {
    const session = await auth();
    if (!session?.user?.id) return { data: [], error: null };

    try {
      const { data } = await axios.get<{ data: ExamWithRelations[] }>("/api/v1/exams");
      return { data: data.data, error: null };
    } catch {
      return { data: [], error: null };
    }
  },

  create: createExam,
  update: updateExam,
  updateScore: updateExamScore,
  remove: deleteExam,
};
