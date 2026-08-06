import "server-only";

import type { ActionResult, MutationResult } from "@/lib/types/common";
import type { CreateHomeworkInput, HomeworkWithRelations } from "@/lib/types/homework";

/** TODO(Phase 11 — Homework & Exams): replace stubs with Supabase queries. */
export const homeworkActions = {
  async getAll(): Promise<ActionResult<HomeworkWithRelations[]>> {
    return { data: [], error: null };
  },

  async create(_input: CreateHomeworkInput): Promise<MutationResult> {
    return { success: false, error: "Not implemented until Phase 11." };
  },

  async toggleCompleted(_id: string, _completed: boolean): Promise<MutationResult> {
    return { success: false, error: "Not implemented until Phase 11." };
  },

  async remove(_id: string): Promise<MutationResult> {
    return { success: false, error: "Not implemented until Phase 11." };
  },
};
