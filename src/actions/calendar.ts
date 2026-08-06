import "server-only";

import type { ActionResult, MutationResult } from "@/lib/types/common";
import type { CalendarMonthData } from "@/lib/types/calendar";

/** TODO(Phase 12 — Calendar): replace stubs with Supabase queries. */
export const calendarActions = {
  async getMonth(_year: number, _month: number): Promise<ActionResult<CalendarMonthData>> {
    return { data: null, error: null };
  },

  async rescheduleLesson(_lessonId: string, _newDate: string): Promise<MutationResult> {
    return { success: false, error: "Not implemented until Phase 12." };
  },
};
