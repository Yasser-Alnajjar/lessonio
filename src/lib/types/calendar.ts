import type { ClassWithRelations } from "./class";
import type { LessonWithRelations } from "./lesson";

export interface CalendarDay {
  date: string; // ISO date
  lessons: LessonWithRelations[];
  classes: ClassWithRelations[];
}

export interface CalendarMonthData {
  year: number;
  month: number; // 1-12
  days: CalendarDay[];
}
