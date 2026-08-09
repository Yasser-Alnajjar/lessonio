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
import { format, startOfMonth, startOfWeek } from "date-fns";

import { createClient } from "@/lib/supabase/server";
import type { MutationResult } from "@/lib/types/common";
import type { CreateGoalInput, GoalPeriod, UpdateGoalInput } from "@/lib/types/goal";
import type { Database } from "@/lib/types/database";

type GoalUpdate = Database["public"]["Tables"]["goals"]["Update"];

/** Matches the Monday-start week convention already used in src/actions/statistics.ts. */
function currentPeriodStart(period: GoalPeriod): string {
  const today = new Date();
  const start = period === "weekly" ? startOfWeek(today, { weekStartsOn: 1 }) : startOfMonth(today);
  return format(start, "yyyy-MM-dd");
}

/**
 * Sets (creates or overwrites) the goal for the current week/month. Uses
 * the table's `unique (user_id, period, period_start)` constraint as the
 * upsert key, so re-submitting for the same in-progress period just
 * updates its target rather than erroring.
 */
export async function setCurrentGoal(input: CreateGoalInput): Promise<MutationResult> {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    return { success: false, error: "You must be signed in." };
  }

  const { error } = await supabase.from("goals").upsert(
    {
      user_id: authData.user.id,
      period: input.period,
      period_start: currentPeriodStart(input.period),
      target_minutes: input.targetMinutes,
    },
    { onConflict: "user_id,period,period_start" },
  );

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

export async function updateGoal(id: string, input: UpdateGoalInput): Promise<MutationResult> {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    return { success: false, error: "You must be signed in." };
  }

  const patch: GoalUpdate = {};
  if (input.targetMinutes !== undefined) patch.target_minutes = input.targetMinutes;

  const { error } = await supabase
    .from("goals")
    .update(patch)
    .eq("id", id)
    .eq("user_id", authData.user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

export async function deleteGoal(id: string): Promise<MutationResult> {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    return { success: false, error: "You must be signed in." };
  }

  const { error } = await supabase
    .from("goals")
    .delete()
    .eq("id", id)
    .eq("user_id", authData.user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}
