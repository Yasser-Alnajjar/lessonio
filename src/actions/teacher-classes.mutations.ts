"use server";

/**
 * Client-invokable teacher-class mutations, kept in a dedicated file
 * (file-level "use server", every export is an async function). Client
 * Components import this module directly (`@/actions/teacher-classes.mutations`)
 * instead of the `@/actions` barrel — see `classes.mutations.ts` for why.
 */

import { revalidatePath } from "next/cache";

import { axios } from "@/lib/client";
import { getApiErrorMessage } from "@/lib/client/errors";
import { requireRole } from "./auth.guards";
import type { MutationResult, ActionResult } from "@/lib/types/common";
import type {
  CreateTeacherClassInput,
  UpdateTeacherClassInput,
} from "@/lib/types/teacher-class";

/** `POST teaching/classes` inserts the class and its join code in one transaction (TCLASS-004). */
export async function createTeacherClass(
  input: CreateTeacherClassInput,
): Promise<MutationResult> {
  const auth = await requireRole("teacher");
  if ("error" in auth) return { success: false, error: auth.error };

  try {
    await axios.post("/api/v1/teaching/classes", {
      name: input.name,
      subjectLabel: input.subjectLabel || undefined,
      description: input.description || undefined,
    });
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

export async function updateTeacherClass(
  id: string,
  input: UpdateTeacherClassInput,
): Promise<MutationResult> {
  const auth = await requireRole("teacher");
  if ("error" in auth) return { success: false, error: auth.error };

  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.subjectLabel !== undefined)
    patch.subjectLabel = input.subjectLabel || null;
  if (input.description !== undefined)
    patch.description = input.description || null;
  if (input.isArchived !== undefined) patch.isArchived = input.isArchived;

  if (Object.keys(patch).length === 0) {
    return { success: true, error: null };
  }

  try {
    await axios.patch(`/api/v1/teaching/classes/${id}`, patch);
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

/** Toggles `is_archived` server-side (TCLASS-006). Archiving hides a class from active use without deleting its roster/history. */
export async function toggleArchivedTeacherClass(
  id: string,
): Promise<MutationResult> {
  const auth = await requireRole("teacher");
  if ("error" in auth) return { success: false, error: auth.error };

  try {
    await axios.post(`/api/v1/teaching/classes/${id}/archive`);
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

/**
 * Deletes the class permanently. Its join code and enrollments go with it
 * via cascade — there is no "undo" once a teacher deletes a class, unlike
 * leaving/removing a single student.
 */
export async function deleteTeacherClass(id: string): Promise<MutationResult> {
  const auth = await requireRole("teacher");
  if ("error" in auth) return { success: false, error: auth.error };

  try {
    await axios.delete(`/api/v1/teaching/classes/${id}`);
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

export async function rotateJoinCode(
  classId: string,
): Promise<ActionResult<string>> {
  const auth = await requireRole("teacher");
  if ("error" in auth) return { data: null, error: auth.error };

  let newCode: string;
  try {
    const { data } = await axios.post<{ data: string }>(
      `/api/v1/teaching/classes/${classId}/rotate-code`,
    );
    newCode = data.data;
  } catch (error) {
    return { data: null, error: getApiErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { data: newCode, error: null };
}
