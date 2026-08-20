import type { ClassOccurrenceWithRelations } from "./class-occurrence";
import type { LessonWithRelations } from "./lesson";

export interface CalendarDay {
  date: string; // ISO date
  lessons: LessonWithRelations[];
  classes: ClassOccurrenceWithRelations[];
}

export interface CalendarMonthData {
  year: number;
  month: number; // 1-12
  days: CalendarDay[];
}
