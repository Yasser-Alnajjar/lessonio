"use server";

/**
 * Client-invokable homework mutations, kept in a dedicated file (file-level
 * "use server", every export is an async function). Client Components import
 * this module directly (`@/actions/homework.mutations`) instead of the
 * `@/actions` barrel. `src/actions/homework.ts` re-exports these under
 * `Actions.Homework.*` for SSR use. Same pattern as `lessons.mutations.ts`.
 */

import { revalidatePath } from "next/cache";

import { auth } from "@auth";
import { axios } from "@/lib/client";
import { getApiErrorMessage } from "@/lib/client/errors";
import type { MutationResult } from "@/lib/types/common";
import type {
  CreateHomeworkInput,
  UpdateHomeworkInput,
} from "@/lib/types/homework";

export async function createHomework(
  input: CreateHomeworkInput,
): Promise<MutationResult> {
  const session = await auth();
  if (!session?.user?.id)
    return { success: false, error: "You must be signed in." };

  try {
    // subjectId is derived server-side from the lesson (HW-002) — never sent by the client.
    await axios.post("/api/v1/homework", {
      lessonId: input.lessonId,
      title: input.title,
      deadline: input.deadline,
    });
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

export async function updateHomework(
  id: string,
  input: UpdateHomeworkInput,
): Promise<MutationResult> {
  const session = await auth();
  if (!session?.user?.id)
    return { success: false, error: "You must be signed in." };

  const patch: Record<string, unknown> = {};
  if (input.lessonId !== undefined) patch.lessonId = input.lessonId;
  if (input.title !== undefined) patch.title = input.title;
  if (input.deadline !== undefined) patch.deadline = input.deadline;
  if (input.completed !== undefined) patch.completed = input.completed;

  if (Object.keys(patch).length === 0) {
    return { success: true, error: null };
  }

  try {
    // HW-003 — sparse PATCH; changing lessonId re-derives subjectId server-side.
    await axios.patch(`/api/v1/homework/${id}`, patch);
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

export async function toggleHomeworkCompleted(
  id: string,
  completed: boolean,
): Promise<MutationResult> {
  const session = await auth();
  if (!session?.user?.id)
    return { success: false, error: "You must be signed in." };

  try {
    // HW-004 — sets, not toggles: the caller supplies the target value.
    await axios.patch(`/api/v1/homework/${id}/completed`, { completed });
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

export async function deleteHomework(id: string): Promise<MutationResult> {
  const session = await auth();
  if (!session?.user?.id)
    return { success: false, error: "You must be signed in." };

  try {
    await axios.delete(`/api/v1/homework/${id}`);
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}
