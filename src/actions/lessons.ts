import "server-only";

import { cache } from "react";

import { axios } from "@/lib/client";
import type { ActionResult } from "@/lib/types/common";
import type { LessonFilters, LessonWithRelations } from "@/lib/types/lesson";
import {
  createLesson,
  deleteLesson,
  duplicateLesson,
  toggleArchiveLesson,
  updateLesson,
} from "./lessons.mutations";

/**
 * SSR-facing surface for `Actions.Lessons.*`. Laravel's `LessonResource`
 * (API_CONTRACT.md LESSON-001/002) eager-loads `subject`/`tags` and the
 * note/attachment counts server-side, so these reads are thin passthroughs —
 * no more bulk-hydration `Map`s. Mutations re-export the real Server
 * Actions.
 */
export const lessonsActions = {
  async getAll(
    filters?: LessonFilters,
  ): Promise<ActionResult<LessonWithRelations[]>> {
    try {
      // `tagIds` serializes as repeated `tagIds[]=...` params, which Laravel
      // collects back into an array (LESSON-001) — matches "any of these
      // tags" filtering.
      const { data } = await axios.get<{ data: LessonWithRelations[] }>(
        "/api/v1/lessons",
        {
          params: {
            subjectId: filters?.subjectId,
            studyStatus: filters?.studyStatus,
            reviewStatus: filters?.reviewStatus,
            tagIds: filters?.tagIds,
            dateFrom: filters?.dateFrom,
            dateTo: filters?.dateTo,
          },
        },
      );
      return { data: data.data, error: null };
    } catch {
      return { data: null, error: null };
    }
  },

  getById: cache(
    async (id: string): Promise<ActionResult<LessonWithRelations>> => {
      try {
        const { data } = await axios.get<{
          data: LessonWithRelations | null;
        }>(`/api/v1/lessons/${id}`);
        return { data: data.data, error: null };
      } catch {
        return { data: null, error: null };
      }
    },
  ),

  create: createLesson,
  update: updateLesson,
  duplicate: duplicateLesson,
  archive: toggleArchiveLesson,
  remove: deleteLesson,
};
