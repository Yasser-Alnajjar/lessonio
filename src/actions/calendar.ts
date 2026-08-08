import "server-only";

import { eachDayOfInterval, endOfMonth, format, startOfMonth } from "date-fns";

import type { ActionResult } from "@/lib/types/common";
import type { CalendarMonthData } from "@/lib/types/calendar";
import { lessonsActions } from "./lessons";
import { rescheduleLesson } from "./calendar.mutations";

/** SSR-facing surface for `Actions.Calendar.*`. Mutations re-export the real Server Actions. */
export const calendarActions = {
  /**
   * Buckets the month's lessons by date. Reuses `lessonsActions.getAll` (which
   * already supports `dateFrom`/`dateTo`) instead of duplicating the
   * subject/tag/note/attachment join logic from `lessons.ts`.
   */
  async getMonth(year: number, month: number): Promise<ActionResult<CalendarMonthData>> {
    const monthStart = startOfMonth(new Date(year, month - 1, 1));
    const monthEnd = endOfMonth(monthStart);
    const dateFrom = format(monthStart, "yyyy-MM-dd");
    const dateTo = format(monthEnd, "yyyy-MM-dd");

    const { data: lessons, error } = await lessonsActions.getAll({ dateFrom, dateTo });
    if (error) {
      return { data: null, error };
    }

    const days = eachDayOfInterval({ start: monthStart, end: monthEnd }).map((date) => {
      const iso = format(date, "yyyy-MM-dd");
      return {
        date: iso,
        lessons: (lessons ?? []).filter((lesson) => lesson.date === iso),
      };
    });

    return { data: { year, month, days }, error: null };
  },

  rescheduleLesson,
};
