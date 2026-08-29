"use server";

/**
 * Client-invokable note mutations, kept in a dedicated file (file-level
 * "use server", every export is an async function — required by Next.js).
 * Client Components import this module directly
 * (`@/actions/lesson-notes.mutations`) instead of the `@/actions` barrel.
 * `src/actions/lesson-notes.ts` re-exports these under `Actions.Notes.*`
 * for SSR use. Same pattern as `subjects.mutations.ts`.
 */

import { revalidatePath } from "next/cache";

import { axios } from "@/lib/client";
import { getApiErrorMessage } from "@/lib/client/errors";
import type { MutationResult } from "@/lib/types/common";
import type {
  CreateLessonNoteInput,
  LessonNote,
  UpdateLessonNoteInput,
} from "@/lib/types/lesson-note";

export type CreateNoteResult =
  | { success: true; error: null; note: LessonNote }
  | { success: false; error: string; note: null };

/** `lessonId` addresses the route (`POST lessons/{lessonId}/notes`, NOTE-002) and is not part of the body. */
export async function createNote(input: CreateLessonNoteInput): Promise<CreateNoteResult> {
  try {
    const { data } = await axios.post<{ data: LessonNote }>(
      `/api/v1/lessons/${input.lessonId}/notes`,
      { title: input.title, contentMarkdown: input.contentMarkdown },
    );

    revalidatePath("/", "layout");
    return { success: true, error: null, note: data.data };
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error), note: null };
  }
}

/** Used for both manual saves and debounced autosave from the note editor. `lessonId` is not updatable (NOTE-003). */
export async function updateNote(
  id: string,
  input: UpdateLessonNoteInput,
): Promise<MutationResult> {
  try {
    await axios.patch(`/api/v1/notes/${id}`, input);
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

export async function deleteNote(id: string): Promise<MutationResult> {
  try {
    await axios.delete(`/api/v1/notes/${id}`);
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}
