import "server-only";

import { auth } from "@auth";
import { axios } from "@/lib/client";
import type { ActionResult } from "@/lib/types/common";
import type { DashboardOverviewData } from "@/lib/types/dashboard";

/**
 * Single-round-trip read of `GET /api/v1/dashboard/overview` (DASH-001,
 * API_CONTRACT.md §7.23). Laravel's `DashboardService::overview()` now owns
 * every widget this action used to assemble from ~15 separate Supabase
 * queries (agenda, recent activity, weekly summary, XP/streak progress,
 * assigned work) — the response shape is identical to `DashboardOverviewData`
 * field-for-field, so no client-side mapping or recomputation is needed.
 */
export const dashboardActions = {
  async getOverview(): Promise<ActionResult<DashboardOverviewData>> {
    const session = await auth();
    if (!session?.jwt?.accessToken) return { data: null, error: null };

    try {
      const { data } = await axios.get<{ data: DashboardOverviewData }>(
        "/api/v1/dashboard/overview",
      );
      return { data: data.data, error: null };
    } catch {
      return { data: null, error: null };
    }
  },
};
