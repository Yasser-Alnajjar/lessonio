import "server-only";

import type { ActionResult, MutationResult } from "@/lib/types/common";
import type {
  CreateSubjectInput,
  SubjectWithStats,
  UpdateSubjectInput,
} from "@/lib/types/subject";

/** TODO(Phase 8 — Subject CRUD): replace stubs with Supabase queries. */
export const subjectsActions = {
  async getAll(): Promise<ActionResult<SubjectWithStats[]>> {
    return { data: [], error: null };
  },

  async getById(_id: string): Promise<ActionResult<SubjectWithStats>> {
    return { data: null, error: null };
  },

  async create(_input: CreateSubjectInput): Promise<MutationResult> {
    return { success: false, error: "Not implemented until Phase 8." };
  },

  async update(_id: string, _input: UpdateSubjectInput): Promise<MutationResult> {
    return { success: false, error: "Not implemented until Phase 8." };
  },

  async remove(_id: string): Promise<MutationResult> {
    return { success: false, error: "Not implemented until Phase 8." };
  },
};
