"use server";

/**
 * Client-invokable class-occurrence mutations, kept in a dedicated file
 * (file-level "use server", every export is an async function — required by
 * Next.js). Client Components import this module directly
 * (`@/actions/class-occurrences.mutations`) instead of the `@/actions`
 * barrel, so they never pull in the other domains' still-`server-only` stub
 * actions into the client bundle. `src/actions/class-occurrences.ts`
 * re-exports these under `Actions.ClassOccurrences.*` for SSR use.
 *
 * Occurrences are never created or deleted by hand — they are materialized
 * from the recurring class server-side — so recording attendance and exam
 * state is the only mutation here, and this is their sole writer.
 */

import { revalidatePath } from "next/cache";

import { axios } from "@/lib/client";
import { getApiErrorMessage } from "@/lib/client/errors";
import type { MutationResult } from "@/lib/types/common";
import type { UpdateClassOccurrenceInput } from "@/lib/types/class-occurrence";

/**
 * Records attendance and/or exam state against one specific date
 * (OCCUR-004).
 *
 * Scoped to a single occurrence on purpose: next week's occurrence of the
 * same class is a separate row and starts with its own unset state, which is
 * the whole reason these two columns don't live on the recurring class.
 *
 * Laravel's `UpdateClassOccurrenceRequest` validates `attendanceStatus`/
 * `examStatus` server-side (`in:attended,absent,late,cancelled` /
 * `in:none,upcoming,completed`), so the client-side enum checks that used to
 * guard against a raw Postgres constraint error are no longer needed here —
 * `getApiErrorMessage()` surfaces the 422 validation message instead.
 */
export async function updateClassOccurrenceStatus(
  id: string,
  input: UpdateClassOccurrenceInput,
): Promise<MutationResult> {
  try {
    await axios.patch(`/api/v1/class-occurrences/${id}`, input);
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}
