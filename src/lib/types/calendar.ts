import type { LessonWithRelations } from "./lesson";

export interface CalendarDay {
  date: string; // ISO date
  lessons: LessonWithRelations[];
}

export interface CalendarMonthData {
  year: number;
  month: number; // 1-12
  days: CalendarDay[];
}
