"use server";

/**
 * Client-invokable class mutations, kept in a dedicated file (file-level
 * "use server", every export is an async function — required by Next.js).
 * Client Components import this module directly (`@/actions/classes.mutations`)
 * instead of the `@/actions` barrel, so they never pull in the other domains'
 * still-`server-only` stub actions into the client bundle.
 * `src/actions/classes.ts` re-exports these under `Actions.Classes.*` for SSR
 * use. Same pattern as `lessons.mutations.ts`.
 *
 * These act on the *recurring* class. Attendance and exam state belong to a
 * specific date and are written by
 * `src/actions/class-occurrences.mutations.ts`.
 *
 * Occurrence-materialization side effects — resetting the materialization
 * stamp after create/update/toggle, purging future untouched occurrences on
 * update/pause — are no longer driven from here. Laravel's `ClassService`
 * (backed by `ClassOccurrenceMaterializer`, API_CONTRACT.md
 * CLASS-003/004/005) performs them server-side, inside the same request, so
 * there is no more client-side equivalent of the old
 * `resetClassOccurrencesMaterializedAt()` / `deleteFutureUntouchedOccurrences()`
 * calls (see `class-occurrences.generate.ts`, deleted — the backend fully
 * owns materialization now).
 */

import { revalidatePath } from "next/cache";

import { axios } from "@/lib/client";
import { getApiErrorMessage } from "@/lib/client/errors";
import type { MutationResult } from "@/lib/types/common";
import type { CreateClassInput, UpdateClassInput } from "@/lib/types/class";

export async function createClass(
  input: CreateClassInput,
): Promise<MutationResult> {
  try {
    // CreateClassInput already matches CLASS-003's body 1:1, meetings included.
    await axios.post("/api/v1/classes", input);
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

export async function updateClass(
  id: string,
  input: UpdateClassInput,
): Promise<MutationResult> {
  try {
    // Sparse PATCH (CLASS-004) — an empty patch short-circuits to success
    // server-side too, so no need to skip the call on an empty `input` here.
    await axios.patch(`/api/v1/classes/${id}`, input);
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

/** Toggles `is_active` (CLASS-005). Deactivating pauses the class without deleting it. */
export async function toggleActiveClass(id: string): Promise<MutationResult> {
  try {
    await axios.post(`/api/v1/classes/${id}/toggle-active`);
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

/**
 * Deletes the class permanently (CLASS-006). Its occurrences — including
 * any recorded attendance and exam state — go with it via the cascade on
 * `class_occurrences.class_id` (API_CONTRACT.md §8.3); an occurrence cannot
 * outlive the class it belongs to. Lessons linked to those occurrences are
 * *not* deleted: `lessons.class_occurrence_id` is nulled instead.
 */
export async function deleteClass(id: string): Promise<MutationResult> {
  try {
    await axios.delete(`/api/v1/classes/${id}`);
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}
