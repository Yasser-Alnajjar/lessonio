"use server";

/**
 * Client-invokable calendar mutations, kept in a dedicated file (file-level
 * "use server", every export is an async function). Client Components import
 * this module directly (`@/actions/calendar.mutations`) instead of the
 * `@/actions` barrel. `src/actions/calendar.ts` re-exports this under
 * `Actions.Calendar.rescheduleLesson` for SSR use. Same pattern as
 * `lessons.mutations.ts`.
 */

import { revalidatePath } from "next/cache";

import { axios } from "@/lib/client";
import { getApiErrorMessage } from "@/lib/client/errors";
import type { MutationResult } from "@/lib/types/common";

/**
 * Moves a lesson to a new date — the only calendar mutation, driven by
 * drag-and-drop. `PATCH /api/v1/lessons/{id}/reschedule` (LESSON-008) sets
 * only `lessons.date`; it lives in the calendar domain because it backs
 * month-view drag-and-drop, but it writes the `lessons` table.
 */
export async function rescheduleLesson(
  lessonId: string,
  newDate: string,
): Promise<MutationResult> {
  try {
    await axios.patch(`/api/v1/lessons/${lessonId}/reschedule`, {
      date: newDate,
    });
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}
