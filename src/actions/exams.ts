import "server-only";

import type { ActionResult, MutationResult } from "@/lib/types/common";
import type { CreateExamInput, ExamWithRelations } from "@/lib/types/exam";

/** TODO(Phase 11 — Homework & Exams): replace stubs with Supabase queries. */
export const examsActions = {
  async getAll(): Promise<ActionResult<ExamWithRelations[]>> {
    return { data: [], error: null };
  },

  async create(_input: CreateExamInput): Promise<MutationResult> {
    return { success: false, error: "Not implemented until Phase 11." };
  },

  async updateScore(_id: string, _score: number): Promise<MutationResult> {
    return { success: false, error: "Not implemented until Phase 11." };
  },

  async remove(_id: string): Promise<MutationResult> {
    return { success: false, error: "Not implemented until Phase 11." };
  },
};
