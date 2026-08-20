import type { UUID } from "./common";
import type { Database } from "./database";
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
  },
};

export interface UserSettings {
  userId: UUID;
  theme: ThemeMode;
  locale: string;
  notificationPreferences: NotificationPreferences;
  gradeScale: GradeScaleEntry[];
}

type Tables = Database["public"]["Tables"];

/**
 * A raw dump of every row the signed-in user owns, keyed by table. Built for
 * a one-shot "download my data" export rather than typed app consumption —
 * that's why it carries `Row` shapes straight from the generated schema
 * instead of the app's camelCase domain types.
 */
export interface UserDataExport {
  exportedAt: string;
  profile: Tables["profiles"]["Row"] | null;
  settings: Tables["settings"]["Row"] | null;
  subjects: Tables["subjects"]["Row"][];
  lessons: Tables["lessons"]["Row"][];
  lessonNotes: Tables["lesson_notes"]["Row"][];
  attachments: Tables["attachments"]["Row"][];
  studySessions: Tables["study_sessions"]["Row"][];
  homework: Tables["homework"]["Row"][];
  exams: Tables["exams"]["Row"][];
  tags: Tables["tags"]["Row"][];
  lessonTags: Tables["lesson_tags"]["Row"][];
  notifications: Tables["notifications"]["Row"][];
  goals: Tables["goals"]["Row"][];
  achievements: Tables["user_achievements"]["Row"][];
}
