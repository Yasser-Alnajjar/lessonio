import type { UUID } from "./common";
import type { NotificationType } from "./notification";

export const THEME_MODES = ["light", "dark", "system"] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

export interface NotificationPreferences {
  enabledInBrowser: boolean;
  types: Record<NotificationType, boolean>;
}

export interface UserSettings {
  userId: UUID;
  theme: ThemeMode;
  locale: string;
  notificationPreferences: NotificationPreferences;
}
