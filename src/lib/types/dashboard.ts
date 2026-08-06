import type { UUID } from "./common";
import type { GamificationProgress } from "./gamification";
import type { LessonWithRelations } from "./lesson";

export interface RecentActivityItem {
  id: UUID;
  kind: "lesson_completed" | "note_added" | "homework_done" | "exam_scored";
  label: string;
  occurredAt: string; // ISO datetime
}

export interface WeeklyStudySummary {
  totalMinutes: number;
  targetMinutes: number;
  dayBreakdown: Array<{ date: string; minutes: number }>;
}

export interface DashboardOverviewData {
  greetingName: string;
  progress: GamificationProgress;
  overallProgressPercent: number;
  todayLessons: LessonWithRelations[];
  upcomingLessons: LessonWithRelations[];
  recentActivity: RecentActivityItem[];
  weeklySummary: WeeklyStudySummary;
}
