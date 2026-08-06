import "server-only";

import type { ActionResult } from "@/lib/types/common";
import type { StatisticsOverviewData } from "@/lib/types/statistics";

/** TODO(Phase 13 — Statistics): replace stub with aggregated Supabase queries. */
export const statisticsActions = {
  async getOverview(): Promise<ActionResult<StatisticsOverviewData>> {
    return { data: null, error: null };
  },
};
