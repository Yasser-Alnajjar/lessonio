import type { UUID } from "./common";
import type { GradeScaleEntry } from "./grade";
import type { NotificationType } from "./notification";

export const THEME_MODES = ["light", "dark", "system"] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

export interface NotificationChannelPreferences {
  in_app: boolean;
  email: boolean;
  push: boolean;
}

export interface NotificationTypePreference {
  in_app: boolean;
  email: boolean;
}

export interface NotificationPreferences {
  channels: NotificationChannelPreferences;
  types: Record<NotificationType, NotificationTypePreference>;
}

/** Mirrors the `settings.notification_preferences` jsonb column default. */
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  channels: { in_app: true, email: false, push: false },
  types: {
    "lesson.upcoming": { in_app: true, email: false },
    "lesson.review_due": { in_app: true, email: false },
    "homework.due_soon": { in_app: true, email: false },
    "class.reminder": { in_app: true, email: false },
    "digest.daily": { in_app: true, email: false },
    "assignment.published": { in_app: true, email: false },
    "assignment.updated": { in_app: true, email: false },
    "assignment.due_soon": { in_app: true, email: false },
    "submission.created": { in_app: true, email: false },
    "submission.graded": { in_app: true, email: false },
    "exam.reminder": { in_app: true, email: false },
    "achievement.unlocked": { in_app: true, email: false },
    "goal.completed": { in_app: true, email: false },
  },
};

export interface UserSettings {
  userId: UUID;
  theme: ThemeMode;
  locale: string;
  notificationPreferences: NotificationPreferences;
  gradeScale: GradeScaleEntry[];
}

/** One exported row, shape unspecified — the backend returns raw table rows for this endpoint. */
type ExportedRow = Record<string, unknown>;

/**
 * A raw dump of every row the signed-in user owns, keyed by table. Built for
 * a one-shot "download my data" export rather than typed app consumption —
 * that's why it carries loosely-typed row shapes straight from the backend
 * instead of the app's camelCase domain types.
 */
export interface UserDataExport {
  exportedAt: string;
  profile: ExportedRow | null;
  settings: ExportedRow | null;
  subjects: ExportedRow[];
  classes: ExportedRow[];
  classOccurrences: ExportedRow[];
  lessons: ExportedRow[];
  lessonNotes: ExportedRow[];
  attachments: ExportedRow[];
  studySessions: ExportedRow[];
  homework: ExportedRow[];
  exams: ExportedRow[];
  tags: ExportedRow[];
  lessonTags: ExportedRow[];
  notifications: ExportedRow[];
  goals: ExportedRow[];
  achievements: ExportedRow[];
}
