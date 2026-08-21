import type { HelpStatusGroup } from "@/lib/help/content";

/**
 * Ordered status values per group, matching the exact enum values used by
 * the actual data model (see src/lib/types/class-occurrence.ts and
 * src/lib/types/lesson.ts). Copy for each value lives in i18n under
 * `help.statuses.<group>.<value>`.
 */
export const HELP_STATUS_VALUES: Record<HelpStatusGroup, string[]> = {
  attendance: ["not_recorded", "attended", "late", "absent", "cancelled"],
  examStatus: ["none", "upcoming", "completed"],
  studyStatus: ["not_started", "studying", "completed", "reviewed"],
  reviewStatus: ["not_reviewed", "needs_review", "reviewed"],
  homeworkStatus: ["none", "pending", "in_progress", "completed"],
  goalPeriod: ["weekly", "monthly"],
  notificationType: [
    "upcoming_class",
    "upcoming_lesson",
    "homework_due",
    "review_reminder",
    "daily_reminder",
  ],
};
