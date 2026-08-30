import type { AuditFields, UUID } from "./common";

export const NOTIFICATION_TYPES = [
  "lesson.upcoming",
  "lesson.review_due",
  "homework.due_soon",
  "class.reminder",
  "digest.daily",
  "assignment.published",
  "assignment.updated",
  "assignment.due_soon",
  "submission.created",
  "submission.graded",
  "exam.reminder",
  "achievement.unlocked",
  "goal.completed",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface Notification extends AuditFields {
  id: UUID;
  userId: UUID;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  entityType: string | null;
  entityId: UUID | null;
  readAt: string | null;
  linkPath: string | null;
}
