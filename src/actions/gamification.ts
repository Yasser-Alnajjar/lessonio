import "server-only";

import type { ActionResult } from "@/lib/types/common";
import type { Achievement } from "@/lib/types/achievement";
import type { Goal } from "@/lib/types/goal";

/** TODO(built alongside relevant CRUD phases): replace stubs with Supabase queries. */
export const gamificationActions = {
  async getAchievements(): Promise<ActionResult<Achievement[]>> {
    return { data: [], error: null };
  },

  async getGoals(): Promise<ActionResult<Goal[]>> {
    return { data: [], error: null };
  },
};
