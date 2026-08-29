import "server-only";

import { cache } from "react";

import { axios } from "@/lib/client";
import type { ActionResult } from "@/lib/types/common";
import type { ClassWithSubject } from "@/lib/types/class";
import {
  createClass,
  deleteClass,
  toggleActiveClass,
  updateClass,
} from "./classes.mutations";

/**
 * SSR-facing surface for `Actions.Classes.*` — the *recurring* class, the
 * single source of truth for the domain. The dated instances that carry
 * attendance/exam state are `Actions.ClassOccurrences.*`.
 *
 * `getAll`/`getById` are plain SSR-only reads — Laravel's `ClassResource`
 * (API_CONTRACT.md CLASS-001/002) already eager-loads the subject and
 * linked teacher class, so these are thin passthroughs. The mutations are
 * re-exported references to the real Server Actions defined in
 * `classes.mutations.ts` (imported directly by Client Components — see that
 * file's header comment for why).
 */
export const classesActions = {
  async getAll(): Promise<ActionResult<ClassWithSubject[]>> {
    try {
      const { data } = await axios.get<{ data: ClassWithSubject[] }>(
        "/api/v1/classes",
      );
      return { data: data.data, error: null };
    } catch {
      return { data: null, error: null };
    }
  },

  getById: cache(
    async (id: string): Promise<ActionResult<ClassWithSubject>> => {
      try {
        const { data } = await axios.get<{ data: ClassWithSubject | null }>(
          `/api/v1/classes/${id}`,
        );
        return { data: data.data, error: null };
      } catch {
        return { data: null, error: null };
      }
    },
  ),

  create: createClass,
  update: updateClass,
  toggleActive: toggleActiveClass,
  remove: deleteClass,
};
