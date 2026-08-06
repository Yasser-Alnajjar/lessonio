import "server-only";

import type { ActionResult, MutationResult } from "@/lib/types/common";
import type {
  CreateLessonInput,
  LessonFilters,
  LessonWithRelations,
  UpdateLessonInput,
} from "@/lib/types/lesson";

/** TODO(Phase 9 — Lesson CRUD): replace stubs with Supabase queries. */
export const lessonsActions = {
  async getAll(_filters?: LessonFilters): Promise<ActionResult<LessonWithRelations[]>> {
    return { data: [], error: null };
  },

  async getById(_id: string): Promise<ActionResult<LessonWithRelations>> {
    return { data: null, error: null };
  },

  async create(_input: CreateLessonInput): Promise<MutationResult> {
    return { success: false, error: "Not implemented until Phase 9." };
  },

  async update(_id: string, _input: UpdateLessonInput): Promise<MutationResult> {
    return { success: false, error: "Not implemented until Phase 9." };
  },

  async duplicate(_id: string): Promise<MutationResult> {
    return { success: false, error: "Not implemented until Phase 9." };
  },

  async archive(_id: string): Promise<MutationResult> {
    return { success: false, error: "Not implemented until Phase 9." };
  },

  async remove(_id: string): Promise<MutationResult> {
    return { success: false, error: "Not implemented until Phase 9." };
  },
};
