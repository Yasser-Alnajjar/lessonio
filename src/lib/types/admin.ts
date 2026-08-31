import type { UUID } from "./common";
import type { AppRole } from "./user";

export interface AdminUserRow {
  id: UUID;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: AppRole | null;
  createdAt: string;
}

export interface AdminUserCounts {
  lessons: number;
  subjects: number;
  studySessions: number;
  teacherClasses: number;
  assignments: number;
}

export interface AdminUserDetail extends AdminUserRow {
  timezone: string | null;
  counts: AdminUserCounts;
}

export interface AdminClassRow {
  id: UUID;
  teacherId: UUID;
  teacherName: string | null;
  teacherEmail: string;
  name: string;
  subjectLabel: string | null;
  description: string | null;
  isArchived: boolean;
  studentCount: number;
  createdAt: string;
  updatedAt: string;
}

export type AdminAssignmentStatus = "draft" | "published";

export interface AdminAssignmentRow {
  id: UUID;
  teacherClassId: UUID;
  className: string;
  teacherId: UUID;
  teacherName: string | null;
  title: string;
  dueAt: string | null;
  totalPoints: number;
  status: AdminAssignmentStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** The backend's authoritative CHECK-constraint values (`notification_jobs_status_check`). */
export const NOTIFICATION_JOB_STATUSES = [
  "pending",
  "processing",
  "sent",
  "failed",
  "cancelled",
] as const;
export type NotificationJobStatus = (typeof NOTIFICATION_JOB_STATUSES)[number];

export interface NotificationJobRow {
  id: UUID;
  eventType: string;
  recipientId: UUID;
  recipientEmail: string | null;
  entityType: string | null;
  entityId: UUID | null;
  scheduledAt: string;
  status: NotificationJobStatus;
  attempts: number;
  lastError: string | null;
  processedAt: string | null;
  createdAt: string;
}

/**
 * Mirrors `App\Support\NotificationType::values()` on the backend — the
 * `eventType` filter's authoritative contract. Not hand-picked: every case
 * the enum defines, since which types actually get scheduled depends on
 * admin-editable notification policy, not a fixed subset.
 */
export const NOTIFICATION_EVENT_TYPES = [
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

export interface NotificationJobStats {
  pending: number;
  processing: number;
  sent: number;
  failed: number;
  cancelled: number;
  oldestPendingScheduledAt: string | null;
}

export interface AdminOverview {
  users: {
    total: number;
    students: number;
    teachers: number;
    admins: number;
    unassigned: number;
    newLast7Days: number;
  };
  content: {
    teacherClasses: number;
    archivedTeacherClasses: number;
    assignments: number;
    publishedAssignments: number;
    submissions: number;
    lessons: number;
    subjects: number;
  };
  engagement: {
    runningStudySessions: number;
    studyMinutesLast7Days: number;
  };
  notificationJobs: NotificationJobStats;
  signupTrend: Array<{ date: string; count: number }>;
}
