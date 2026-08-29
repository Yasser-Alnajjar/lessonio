"use server";

/**
 * Client-invokable lesson mutations, kept in a dedicated file (file-level
 * "use server", every export is an async function — required by Next.js).
 * Client Components import this module directly (`@/actions/lessons.mutations`)
 * instead of the `@/actions` barrel. `src/actions/lessons.ts` re-exports
 * these under `Actions.Lessons.*` for SSR use. Same pattern as
 * `subjects.mutations.ts`.
 *
 * `tagIds` is sent straight through in the request body — Laravel's
 * `LessonController@store`/`@update` (LESSON-003/004) attaches/syncs the
 * `lesson_tags` pivot server-side (`$lesson->tags()->attach()` /
 * `->sync()`), so there is no more client-side `syncLessonTags()` join-table
 * management here.
 */

import { revalidatePath } from "next/cache";

import { axios } from "@/lib/client";
import { getApiErrorMessage } from "@/lib/client/errors";
import type { MutationResult } from "@/lib/types/common";
import type { CreateLessonInput, UpdateLessonInput } from "@/lib/types/lesson";

export async function createLesson(input: CreateLessonInput): Promise<MutationResult> {
  try {
    // CreateLessonInput already matches LESSON-003's body 1:1, tagIds included.
    await axios.post("/api/v1/lessons", input);
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

export async function updateLesson(
  id: string,
  input: UpdateLessonInput,
): Promise<MutationResult> {
  try {
    // Sparse PATCH — undefined keys are dropped by JSON.stringify, so an
    // absent `tagIds` leaves the lesson's tags untouched (LESSON-004) while
    // a present one (including `[]`) replaces the whole set.
    await axios.patch(`/api/v1/lessons/${id}`, input);
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

/**
 * Creates a new lesson copying `subjectId`, `classOccurrenceId`, `date`, and
 * the tag set from `id`, resetting every status back to its default and
 * clearing archive — notes and attachments belong to the original occurrence
 * and are not copied. Laravel's `LessonService::duplicate()` (LESSON-005)
 * performs the copy server-side; the new title still gets the same
 * hardcoded `" (Copy)"` suffix.
 */
export async function duplicateLesson(id: string): Promise<MutationResult> {
  try {
    await axios.post(`/api/v1/lessons/${id}/duplicate`);
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

/** Toggles `is_archived` (LESSON-006). Archiving a lesson does not touch its notes or attachments. */
export async function toggleArchiveLesson(id: string): Promise<MutationResult> {
  try {
    await axios.post(`/api/v1/lessons/${id}/archive`);
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

/** Deletes the lesson row (LESSON-007). Cascades to its tags, notes, and attachments. */
export async function deleteLesson(id: string): Promise<MutationResult> {
  try {
    await axios.delete(`/api/v1/lessons/${id}`);
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}
