import "server-only";

import type { ActionResult } from "@/lib/types/common";
import type { DashboardOverviewData } from "@/lib/types/dashboard";

/** TODO(Phase 7 — Dashboard Layout): aggregate real Supabase queries. */
export const dashboardActions = {
  async getOverview(): Promise<ActionResult<DashboardOverviewData>> {
    return { data: null, error: null };
  },
};
