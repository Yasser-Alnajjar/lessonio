import "server-only";

import { eachDayOfInterval, endOfMonth, format, startOfMonth } from "date-fns";

import type { ActionResult } from "@/lib/types/common";
import type { CalendarMonthData } from "@/lib/types/calendar";
import { classOccurrencesActions } from "./class-occurrences";
import { lessonsActions } from "./lessons";
import { rescheduleLesson } from "./calendar.mutations";

/** SSR-facing surface for `Actions.Calendar.*`. Mutations re-export the real Server Actions. */
export const calendarActions = {
  /**
   * Buckets the month's lessons and class occurrences by date. Reuses
   * `lessonsActions.getAll` and `classOccurrencesActions.getAll` (which both
   * support `dateFrom`/`dateTo`) instead of duplicating their join logic here.
   */
  async getMonth(
    year: number,
    month: number,
  ): Promise<ActionResult<CalendarMonthData>> {
    const monthStart = startOfMonth(new Date(year, month - 1, 1));
    const monthEnd = endOfMonth(monthStart);
    const dateFrom = format(monthStart, "yyyy-MM-dd");
    const dateTo = format(monthEnd, "yyyy-MM-dd");

    const [
      { data: lessons, error: lessonsError },
      { data: classes, error: classesError },
    ] = await Promise.all([
      lessonsActions.getAll({ dateFrom, dateTo }),
      classOccurrencesActions.getAll({ dateFrom, dateTo }),
    ]);
    if (lessonsError) {
      return { data: null, error: lessonsError };
    }
    if (classesError) {
      return { data: null, error: classesError };
    }

    const days = eachDayOfInterval({ start: monthStart, end: monthEnd }).map(
      (date) => {
        const iso = format(date, "yyyy-MM-dd");
        return {
          date: iso,
          lessons: (lessons ?? []).filter((lesson) => lesson.date === iso),
          classes: (classes ?? []).filter((_class) => _class.date === iso),
        };
      },
    );

    return { data: { year, month, days }, error: null };
  },

  rescheduleLesson,
};
