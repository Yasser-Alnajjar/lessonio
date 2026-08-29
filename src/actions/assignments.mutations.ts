"use server";

/**
 * Client-invokable assignment mutations, kept in a dedicated file
 * (file-level "use server", every export is an async function). Client
 * Components import this module directly (`@/actions/assignments.mutations`)
 * instead of the `@/actions` barrel — see `classes.mutations.ts` for why.
 */

import { revalidatePath } from "next/cache";

import { axios } from "@/lib/client";
import { getApiErrorMessage } from "@/lib/client/errors";
import { requireRole } from "./auth.guards";
import type { MutationResult } from "@/lib/types/common";
import type {
  CreateAssignmentInput,
  UpdateAssignmentInput,
} from "@/lib/types/assignment";

export async function createAssignment(
  input: CreateAssignmentInput,
): Promise<MutationResult> {
  const auth = await requireRole("teacher");
  if ("error" in auth) return { success: false, error: auth.error };

  try {
    await axios.post("/api/v1/teaching/assignments", {
      teacherClassId: input.teacherClassId,
      title: input.title,
      instructions: input.instructions || undefined,
      dueAt: new Date(input.dueAt).toISOString(),
      totalPoints: input.totalPoints,
    });
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

/** `teacherClassId` is immutable server-side (`enforce_assignment_pin`) — so it's never in this patch. */
export async function updateAssignment(
  id: string,
  input: UpdateAssignmentInput,
): Promise<MutationResult> {
  const auth = await requireRole("teacher");
  if ("error" in auth) return { success: false, error: auth.error };

  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.instructions !== undefined)
    patch.instructions = input.instructions || null;
  if (input.dueAt !== undefined)
    patch.dueAt = new Date(input.dueAt).toISOString();
  if (input.totalPoints !== undefined) patch.totalPoints = input.totalPoints;

  if (Object.keys(patch).length === 0) {
    return { success: true, error: null };
  }

  try {
    await axios.patch(`/api/v1/teaching/assignments/${id}`, patch);
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

/**
 * Publishing is what "assigning work" means — drafts stay invisible to
 * students until this runs. The notification fan-out (`assignment_assigned`
 * per actively-enrolled student) now happens server-side, dispatched
 * best-effort after commit by `POST teaching/assignments/{id}/publish`
 * itself (ASSIGN-006) — no separate notify call needed.
 */
export async function publishAssignment(id: string): Promise<MutationResult> {
  const auth = await requireRole("teacher");
  if ("error" in auth) return { success: false, error: auth.error };

  try {
    await axios.post(`/api/v1/teaching/assignments/${id}/publish`);
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

/** Pulls a published assignment back to draft — it disappears from students immediately. No notification. */
export async function unpublishAssignment(id: string): Promise<MutationResult> {
  const auth = await requireRole("teacher");
  if ("error" in auth) return { success: false, error: auth.error };

  try {
    await axios.post(`/api/v1/teaching/assignments/${id}/unpublish`);
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

export async function deleteAssignment(id: string): Promise<MutationResult> {
  const auth = await requireRole("teacher");
  if ("error" in auth) return { success: false, error: auth.error };

  try {
    await axios.delete(`/api/v1/teaching/assignments/${id}`);
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}
