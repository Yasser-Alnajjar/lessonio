import "server-only";

import { cache } from "react";

import { axios } from "@/lib/client";
import type { ActionResult } from "@/lib/types/common";
import type { SubjectWithStats } from "@/lib/types/subject";
import {
  createSubject,
  deleteSubject,
  updateSubject,
} from "./subjects.mutations";

/**
 * SSR-facing surface for `Actions.Subjects.*`. `getAll`/`getById` are plain
 * SSR-only reads — Laravel's `SubjectResource` (API_CONTRACT.md
 * SUBJ-001/002) already computes `stats` server-side in SQL, so these are
 * thin passthroughs rather than the four-bulk-query-plus-in-memory-aggregate
 * dance the old Supabase implementation did. The mutations are re-exported
 * references to the real Server Actions defined in `subjects.mutations.ts`
 * (imported directly by Client Components — see that file's header comment
 * for why).
 */
export const subjectsActions = {
  async getAll(): Promise<ActionResult<SubjectWithStats[]>> {
    try {
      const { data } = await axios.get<{ data: SubjectWithStats[] }>(
        "/api/v1/subjects",
      );
      return { data: data.data, error: null };
    } catch {
      return { data: null, error: null };
    }
  },

  getById: cache(
    async (id: string): Promise<ActionResult<SubjectWithStats>> => {
      try {
        const { data } = await axios.get<{ data: SubjectWithStats | null }>(
          `/api/v1/subjects/${id}`,
        );
        return { data: data.data, error: null };
      } catch {
        return { data: null, error: null };
      }
    },
  ),

  create: createSubject,
  update: updateSubject,
  remove: deleteSubject,
};
