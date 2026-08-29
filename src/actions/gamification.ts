import "server-only";

import { auth } from "@auth";
import { axios } from "@/lib/client";
import type { ActionResult } from "@/lib/types/common";
import type { Achievement } from "@/lib/types/achievement";
import type { Goal } from "@/lib/types/goal";
import { deleteGoal, setCurrentGoal, updateGoal } from "./gamification.mutations";

/** Real Laravel reads — achievement writes happen server-side automatically on every read, goal writes go through gamification.mutations.ts. */
export const gamificationActions = {
  /**
   * GAME-001 (API_CONTRACT.md §7.22). No client-side sync step: Laravel's
   * `AchievementService::catalogForUser()` runs `sync()` internally before
   * every read, so `GET /gamification/achievements` alone always returns
   * freshly recomputed progress. The old `sync_user_achievements` RPC call
   * that used to precede this read is dropped entirely — there is nothing
   * left for the client to trigger.
   */
  async getAchievements(): Promise<ActionResult<Achievement[]>> {
    const session = await auth();
    if (!session?.jwt?.accessToken) return { data: [], error: null };

    try {
      const { data } = await axios.get<{ data: Achievement[] }>(
        "/api/v1/gamification/achievements",
      );
      return { data: data.data, error: null };
    } catch {
      return { data: [], error: null };
    }
  },

  /** GAME-002. `achievedMinutes` is derived server-side per goal, never a stored column. */
  async getGoals(): Promise<ActionResult<Goal[]>> {
    const session = await auth();
    if (!session?.jwt?.accessToken) return { data: [], error: null };

    try {
      const { data } = await axios.get<{ data: Goal[] }>(
        "/api/v1/gamification/goals",
      );
      return { data: data.data, error: null };
    } catch {
      return { data: [], error: null };
    }
  },

  setCurrentGoal,
  updateGoal,
  deleteGoal,
};
