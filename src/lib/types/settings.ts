import type { UUID } from "./common";
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
    review_reminder: true,
  },
};

export interface UserSettings {
  userId: UUID;
  theme: ThemeMode;
  locale: string;
  notificationPreferences: NotificationPreferences;
}
