"use server";

/**
 * Client-invokable subject mutations, kept in a dedicated file (file-level
 * "use server", every export is an async function — required by Next.js).
 * Client Components import this module directly (`@/actions/subjects.mutations`)
 * instead of the `@/actions` barrel, so they never pull in the other
 * domains' still-`server-only` stub actions into the client bundle.
 * `src/actions/subjects.ts` re-exports these under `Actions.Subjects.*` for
 * SSR use. Same pattern as `auth.mutations.ts`.
 */

import { revalidatePath } from "next/cache";

import { axios } from "@/lib/client";
import { getApiErrorMessage } from "@/lib/client/errors";
import type { MutationResult } from "@/lib/types/common";
import type { CreateSubjectInput, UpdateSubjectInput } from "@/lib/types/subject";

export async function createSubject(input: CreateSubjectInput): Promise<MutationResult> {
  try {
    // CreateSubjectInput already matches SUBJ-003's body 1:1.
    await axios.post("/api/v1/subjects", input);
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

export async function updateSubject(
  id: string,
  input: UpdateSubjectInput,
): Promise<MutationResult> {
  try {
    // A sparse PATCH: axios's JSON.stringify drops `undefined` keys, so only
    // the fields the caller actually set reach Laravel's `sometimes` rules
    // (SUBJ-004) — no need to build the patch object by hand.
    await axios.patch(`/api/v1/subjects/${id}`, input);
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

/**
 * Deletes the subject row. `subjects.id` cascades (on delete cascade) to
 * lessons, which in turn cascade to homework, exams, notes, and
 * attachments — the caller must warn about this before confirming.
 */
export async function deleteSubject(id: string): Promise<MutationResult> {
  try {
    await axios.delete(`/api/v1/subjects/${id}`);
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}
