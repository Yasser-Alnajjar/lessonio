import "server-only";

import { auth } from "@auth";
import { axios } from "@/lib/client";
import type { ActionResult } from "@/lib/types/common";
import type { GradesOverviewData } from "@/lib/types/grade";

const EMPTY_OVERVIEW: GradesOverviewData = { subjects: [], gpa: null, trend: [] };

/**
 * `GET /api/v1/grades/overview` (GRADE-001, soft-empty — API_CONTRACT.md
 * §3.5). `GradeController::overview` reproduces the previous client-side
 * computation exactly (per-subject average/letter/GPA weighting, 6-month
 * trend) and already reads the same `Accept-Language` header the axios
 * interceptor attaches to localize the trend's month labels server-side —
 * so this action no longer needs `next-intl`'s `getLocale()` or any of
 * `src/lib/grades/scale.ts`'s helpers; it's a pure pass-through.
 */
export const gradesActions = {
  async getOverview(): Promise<ActionResult<GradesOverviewData>> {
    const session = await auth();
    if (!session?.user?.id) return { data: EMPTY_OVERVIEW, error: null };

    try {
      const { data } = await axios.get<{ data: GradesOverviewData }>(
        "/api/v1/grades/overview",
      );
      return { data: data.data, error: null };
    } catch {
      return { data: EMPTY_OVERVIEW, error: null };
    }
  },
};
