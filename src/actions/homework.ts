import "server-only";

import { auth } from "@auth";
import { axios } from "@/lib/client";
import type { ActionResult } from "@/lib/types/common";
import type { HomeworkWithRelations } from "@/lib/types/homework";
import {
  createHomework,
  deleteHomework,
  toggleHomeworkCompleted,
  updateHomework,
} from "./homework.mutations";

/** SSR-facing surface for `Actions.Homework.*`. Mutations re-export the real Server Actions. */
export const homeworkActions = {
  /**
   * `GET /api/v1/homework` (HW-001, soft-empty — API_CONTRACT.md §3.5). The
   * Laravel resource already returns the exact `HomeworkWithRelations` shape
   * (subject/lesson hydrated server-side, ordered `deadline ASC`), so this is
   * a thin pass-through rather than a client-side join.
   */
  async getAll(): Promise<ActionResult<HomeworkWithRelations[]>> {
    const session = await auth();
    if (!session?.user?.id) return { data: [], error: null };

    try {
      const { data } = await axios.get<{ data: HomeworkWithRelations[] }>(
        "/api/v1/homework",
      );
      return { data: data.data, error: null };
    } catch {
      return { data: [], error: null };
    }
  },

  create: createHomework,
  update: updateHomework,
  toggleCompleted: toggleHomeworkCompleted,
  remove: deleteHomework,
};
