import type { UUID } from "./common";
import type { GradeScaleEntry } from "./grade";
import type { NotificationType } from "./notification";

export const THEME_MODES = ["light", "dark", "system"] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

export interface NotificationPreferences {
  enabledInBrowser: boolean;
  enabledInEmail: boolean;
  types: Record<NotificationType, boolean>;
}

/** Mirrors the `settings.notification_preferences` jsonb column default. */
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabledInBrowser: true,
  enabledInEmail: false,
  types: {
    upcoming_lesson: true,
    homework_due: true,
    daily_reminder: true,
    upcoming_class: true,
    review_reminder: true,
    assignment_assigned: true,
    assignment_graded: true,
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
