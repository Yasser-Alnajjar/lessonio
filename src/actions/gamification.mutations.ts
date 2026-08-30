"use server";

/**
 * Client-invokable goal mutations, kept in a dedicated file (file-level
 * "use server", every export is an async function). Client Components
 * import this module directly (`@/actions/gamification.mutations`) instead
 * of the `@/actions` barrel. `src/actions/gamification.ts` re-exports these
 * under `Actions.Gamification.*` for a consistent surface. Same pattern as
 * `subjects.mutations.ts`.
 */

import { revalidatePath } from "next/cache";

import { auth } from "@auth";
import { axios } from "@/lib/client";
import { getApiErrorMessage } from "@/lib/client/errors";
import type { MutationResult } from "@/lib/types/common";
import type { CreateGoalInput, UpdateGoalInput } from "@/lib/types/goal";

/**
 * Sets (creates or overwrites) the goal for the current week/month
 * (GAME-003, API_CONTRACT.md §7.22). `POST /gamification/goals` upserts on
 * Laravel's `(user_id, period, period_start)` unique constraint — `period_start`
 * is derived server-side from `period` and today's date, never client-supplied.
 */
export async function setCurrentGoal(
  input: CreateGoalInput,
): Promise<MutationResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "You must be signed in." };
  }

  try {
    await axios.post("/api/v1/gamification/goals", {
      period: input.period,
      targetMinutes: input.targetMinutes,
    });
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

/**
 * GAME-004 — sparse update. Only `targetMinutes` is ever sent: Laravel's
 * `UpdateGoalRequest` rejects `period` outright, since `period_start` is
 * fixed at creation time and a lone `period` patch would break that
 * invariant (see the backend's comment on that request class).
 */
export async function updateGoal(
  id: string,
  input: UpdateGoalInput,
): Promise<MutationResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "You must be signed in." };
  }

  try {
    const patch: { targetMinutes?: number } = {};
    if (input.targetMinutes !== undefined)
      patch.targetMinutes = input.targetMinutes;

    await axios.patch(`/api/v1/gamification/goals/${id}`, patch);
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

export async function deleteGoal(id: string): Promise<MutationResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "You must be signed in." };
  }

  try {
    await axios.delete(`/api/v1/gamification/goals/${id}`);
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}
