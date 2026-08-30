import type { NotificationType } from "@/lib/types/notification";

/**
 * UI-only grouping for the preferences matrix — mirrors the backend's
 * `NotificationType::group()` (`app/Support/NotificationType.php`), which
 * the settings endpoint doesn't itself expose (it returns the flat
 * preferences matrix, not the type catalog).
 */
export const NOTIFICATION_TYPE_GROUPS: Record<NotificationType, string> = {
  "lesson.upcoming": "lessons",
  "lesson.review_due": "lessons",
  "homework.due_soon": "homework",
  "class.reminder": "classes",
  "digest.daily": "digests",
  "assignment.published": "assignments",
  "assignment.updated": "assignments",
  "assignment.due_soon": "assignments",
  "submission.created": "submissions",
  "submission.graded": "submissions",
  "exam.reminder": "exams",
  "achievement.unlocked": "gamification",
  "goal.completed": "gamification",
};

export function groupNotificationTypes(
  types: readonly NotificationType[],
): Map<string, NotificationType[]> {
  const groups = new Map<string, NotificationType[]>();
  for (const type of types) {
    const group = NOTIFICATION_TYPE_GROUPS[type];
    const bucket = groups.get(group) ?? [];
    bucket.push(type);
    groups.set(group, bucket);
  }
  return groups;
}
