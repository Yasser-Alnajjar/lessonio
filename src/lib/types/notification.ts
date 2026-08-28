import type { AuditFields, UUID } from "./common";

export const NOTIFICATION_TYPES = [
  "upcoming_lesson",
  "homework_due",
  "daily_reminder",
  "upcoming_class",
  "review_reminder",
  "assignment_assigned",
  "assignment_graded",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface Notification extends AuditFields {
  id: UUID;
  userId: UUID;
  type: NotificationType;
  title: string;
  body: string;
  readAt: string | null;
  linkPath: string | null;
}
