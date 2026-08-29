import "server-only";

import { axios } from "@/lib/client";
import type { ActionResult } from "@/lib/types/common";
import type { LessonNote } from "@/lib/types/lesson-note";
import { createNote, deleteNote, updateNote } from "./lesson-notes.mutations";

/** SSR-facing surface for `Actions.Notes.*`. Mutations re-export the real Server Actions. */
export const notesActions = {
  async getAllForLesson(lessonId: string): Promise<ActionResult<LessonNote[]>> {
    try {
      const { data } = await axios.get<{ data: LessonNote[] }>(
        `/api/v1/lessons/${lessonId}/notes`,
      );
      return { data: data.data, error: null };
    } catch {
      return { data: null, error: null };
    }
  },

  create: createNote,
  update: updateNote,
  remove: deleteNote,
};
