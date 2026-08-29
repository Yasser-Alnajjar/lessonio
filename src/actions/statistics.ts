import "server-only";

import { auth } from "@auth";
import { axios } from "@/lib/client";
import type { ActionResult } from "@/lib/types/common";
import type { StatisticsOverviewData } from "@/lib/types/statistics";

/**
 * Single-round-trip read of `GET /api/v1/statistics/overview` (STATS-001,
 * API_CONTRACT.md §7.24). Laravel's `StatisticsService::overview()` now owns
 * the six raw-table scans and nine chart/card shaping helpers this action
 * used to run in TypeScript — the response shape is identical to
 * `StatisticsOverviewData` field-for-field.
 *
 * Weekday/month axis labels are localized server-side from the
 * `Accept-Language` header (already attached to every request by the axios
 * interceptor in `@/lib/client`), so the `next-intl` `getLocale()` call the
 * old implementation needed is gone — there's nothing left to pass.
 */
export const statisticsActions = {
  async getOverview(): Promise<ActionResult<StatisticsOverviewData>> {
    const session = await auth();
    if (!session?.jwt?.accessToken) return { data: null, error: null };

    try {
      const { data } = await axios.get<{ data: StatisticsOverviewData }>(
        "/api/v1/statistics/overview",
      );
      return { data: data.data, error: null };
    } catch {
      return { data: null, error: null };
    }
  },
};
