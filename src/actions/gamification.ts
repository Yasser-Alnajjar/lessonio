import "server-only";

import { addDays, addMonths, parseISO } from "date-fns";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/common";
import type { Achievement } from "@/lib/types/achievement";
import type { Goal } from "@/lib/types/goal";
import { deleteGoal, setCurrentGoal, updateGoal } from "./gamification.mutations";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Recomputes achievement progress via the SECURITY DEFINER
 * `sync_user_achievements()` RPC (see supabase/migrations/20260809120018_gamification_sync.sql
 * — user_achievements has no client-writable policy, so this RPC is the
 * sanctioned write path), then reads the joined catalog + per-user state.
 * Exported (not just used internally) so `dashboard.ts` can reuse it for
 * the "unlocked achievements" XP bonus without re-syncing twice.
 */
export async function syncAndFetchUserAchievements(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<Achievement[]> {
  // A sync failure shouldn't blank the whole page — fall back to whatever
  // progress was already persisted from the last successful sync.
  const { error: syncError } = await supabase.rpc("sync_user_achievements");
  if (syncError) {
    console.error("sync_user_achievements failed:", syncError.message);
  }

  const [{ data: catalogRows }, { data: userRows }] = await Promise.all([
    supabase.from("achievements").select("*").order("created_at", { ascending: true }),
    supabase
      .from("user_achievements")
      .select("achievement_id, progress, unlocked_at")
      .eq("user_id", userId),
  ]);

  const progressByAchievementId = new Map(
    (userRows ?? []).map((row) => [row.achievement_id, row]),
  );

  return (catalogRows ?? []).map((row) => {
    const progress = progressByAchievementId.get(row.id);
    return {
      id: row.id,
      key: row.key,
      title: row.title,
      description: row.description,
      icon: row.icon,
      unlockedAt: progress?.unlocked_at ?? null,
      progress: progress?.progress ?? 0,
    };
  });
}

function periodEnd(period: "weekly" | "monthly", periodStart: Date): Date {
  return period === "weekly" ? addDays(periodStart, 7) : addMonths(periodStart, 1);
}

async function fetchGoalsWithAchievedMinutes(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<Goal[]> {
  const { data: goalRows } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", userId)
    .order("period_start", { ascending: false });

  const rows = goalRows ?? [];
  if (rows.length === 0) return [];

  const earliestPeriodStart = rows[rows.length - 1]!.period_start;
  const { data: sessionRows } = await supabase
    .from("study_sessions")
    .select("started_at, duration_minutes")
    .eq("user_id", userId)
    .gte("started_at", earliestPeriodStart);

  const sessions = sessionRows ?? [];

  return rows.map((row) => {
    const start = parseISO(row.period_start);
    const end = periodEnd(row.period as "weekly" | "monthly", start);

    const achievedMinutes = sessions.reduce((sum, session) => {
      const startedAt = parseISO(session.started_at);
      if (startedAt < start || startedAt >= end) return sum;
      return sum + (session.duration_minutes ?? 0);
    }, 0);

    return {
      id: row.id,
      userId: row.user_id,
      period: row.period as Goal["period"],
      targetMinutes: row.target_minutes,
      achievedMinutes,
      periodStart: row.period_start,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });
}

/** Real Supabase queries — achievement writes go through sync_user_achievements(), goal writes through gamification.mutations.ts. */
export const gamificationActions = {
  async getAchievements(): Promise<ActionResult<Achievement[]>> {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return { data: [], error: null };
    }

    const achievements = await syncAndFetchUserAchievements(supabase, authData.user.id);
    return { data: achievements, error: null };
  },

  async getGoals(): Promise<ActionResult<Goal[]>> {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return { data: [], error: null };
    }

    const goals = await fetchGoalsWithAchievedMinutes(supabase, authData.user.id);
    return { data: goals, error: null };
  },

  setCurrentGoal,
  updateGoal,
  deleteGoal,
};
