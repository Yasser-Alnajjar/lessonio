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
 * from the recurring class by `class-occurrences.generate.ts` and cascade
 * away with it — so recording attendance and exam state is the only mutation
 * here, and this is their sole writer.
 */

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { MutationResult } from "@/lib/types/common";
import {
  ATTENDANCE_STATUSES,
  CLASS_EXAM_STATUSES,
} from "@/lib/types/class-occurrence";
import type { UpdateClassOccurrenceInput } from "@/lib/types/class-occurrence";
import type { Database } from "@/lib/types/database";

type ClassOccurrenceUpdate =
  Database["public"]["Tables"]["class_occurrences"]["Update"];

/**
 * Records attendance and/or exam state against one specific date.
 *
 * Scoped to a single occurrence on purpose: next week's occurrence of the
 * same class is a separate row and starts with its own unset state, which is
 * the whole reason these two columns don't live on the recurring class.
 */
export async function updateClassOccurrenceStatus(
  id: string,
  input: UpdateClassOccurrenceInput,
): Promise<MutationResult> {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return { success: false, error: "You must be signed in." };
  }

  const patch: ClassOccurrenceUpdate = {};

  if (input.attendanceStatus !== undefined) {
    // Validated here rather than trusting the client: these arrive straight
    // from a <Select> and the DB check constraint would surface as a raw
    // Postgres error rather than a usable message.
    if (
      input.attendanceStatus !== null &&
      !ATTENDANCE_STATUSES.includes(input.attendanceStatus)
    ) {
      return { success: false, error: "Unknown attendance status." };
    }
    patch.attendance_status = input.attendanceStatus;
  }

  if (input.examStatus !== undefined) {
    if (!CLASS_EXAM_STATUSES.includes(input.examStatus)) {
      return { success: false, error: "Unknown exam status." };
    }
    patch.exam_status = input.examStatus;
  }

  if (Object.keys(patch).length === 0) {
    return { success: true, error: null };
  }

  const { error } = await supabase
    .from("class_occurrences")
    .update(patch)
    .eq("id", id)
    .eq("user_id", authData.user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}
