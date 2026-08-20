import type { UUID } from "./common";
import type { ClassOccurrenceWithRelations } from "./class-occurrence";
import type { GamificationProgress } from "./gamification";

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
  todayClasses: ClassOccurrenceWithRelations[];
  upcomingClasses: ClassOccurrenceWithRelations[];
  recentActivity: RecentActivityItem[];
  weeklySummary: WeeklyStudySummary;
}
