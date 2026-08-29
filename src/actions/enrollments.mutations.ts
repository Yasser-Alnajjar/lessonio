"use server";

/**
 * Client-invokable enrollment mutations, kept in a dedicated file
 * (file-level "use server", every export is an async function). Client
 * Components import this module directly (`@/actions/enrollments.mutations`)
 * instead of the `@/actions` barrel — see `classes.mutations.ts` for why.
 */

import { revalidatePath } from "next/cache";

import { axios } from "@/lib/client";
import { getApiErrorMessage } from "@/lib/client/errors";
import { requireRole } from "./auth.guards";
import type { ActionResult, MutationResult } from "@/lib/types/common";

/**
 * `POST classroom/classes/join` (ENROLL-002) normalizes the code, guards the
 * student role, and upserts the enrollment (re-joining after leaving is
 * idempotent) server-side. A wrong/unknown code comes back as a `404` whose
 * body is the exact sentinel string `"invalid_join_code"` — `getApiErrorMessage`
 * surfaces that string as-is (never a stack trace) for the UI to translate,
 * same as the old RPC error message.
 */
export async function joinClass(code: string): Promise<ActionResult<string>> {
  const auth = await requireRole("student");
  if ("error" in auth) return { data: null, error: auth.error };

  let teacherClassId: string;
  try {
    const { data } = await axios.post<{ data: string }>(
      "/api/v1/classroom/classes/join",
      { code },
    );
    teacherClassId = data.data;
  } catch (error) {
    return { data: null, error: getApiErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { data: teacherClassId, error: null };
}

/**
 * Sets the caller's own enrollment to "removed" — never deletes, so
 * historical submissions survive a student leaving.
 */
export async function leaveClass(classId: string): Promise<MutationResult> {
  const auth = await requireRole("student");
  if ("error" in auth) return { success: false, error: auth.error };

  try {
    await axios.post(`/api/v1/classroom/classes/${classId}/leave`);
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

/**
 * Teacher-only: sets a student's enrollment back to "removed" (ENROLL-004).
 * The route lives under `teaching/*`, not `classroom/*`, even though it acts
 * on an enrollment — it's the teacher's own roster-management action.
 */
export async function removeStudent(
  classId: string,
  studentId: string,
): Promise<MutationResult> {
  const auth = await requireRole("teacher");
  if ("error" in auth) return { success: false, error: auth.error };

  try {
    await axios.delete(
      `/api/v1/teaching/classes/${classId}/roster/${studentId}`,
    );
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}
