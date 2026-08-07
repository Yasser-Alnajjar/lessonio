import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/common";
import type { LessonNote } from "@/lib/types/lesson-note";
import type { Database } from "@/lib/types/database";
import { createNote, deleteNote, updateNote } from "./lesson-notes.mutations";

type LessonNoteRow = Database["public"]["Tables"]["lesson_notes"]["Row"];

function mapNoteRow(row: LessonNoteRow): LessonNote {
  return {
    id: row.id,
    lessonId: row.lesson_id,
    userId: row.user_id,
    title: row.title,
    contentMarkdown: row.content_markdown,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** SSR-facing surface for `Actions.Notes.*`. Mutations re-export the real Server Actions. */
export const notesActions = {
  async getAllForLesson(lessonId: string): Promise<ActionResult<LessonNote[]>> {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return { data: [], error: null };
    }

    const { data: rows, error } = await supabase
      .from("lesson_notes")
      .select("*")
      .eq("lesson_id", lessonId)
      .eq("user_id", authData.user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: (rows ?? []).map(mapNoteRow), error: null };
  },

  create: createNote,
  update: updateNote,
  remove: deleteNote,
};
