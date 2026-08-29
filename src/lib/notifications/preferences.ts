import type { Json } from "@/lib/types/common";
import { NOTIFICATION_TYPES, type NotificationType } from "@/lib/types/notification";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationPreferences,
} from "@/lib/types/settings";

/**
 * `settings.notification_preferences` is a jsonb column, so Postgres types it
 * as unstructured `Json`. Rows provisioned before a preference key existed
 * simply won't have it — parse defensively and fill from the defaults rather
 * than trusting the shape.
 */
export function parseNotificationPreferences(value: Json | null): NotificationPreferences {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }

  const rawTypes =
    typeof value.types === "object" && value.types !== null && !Array.isArray(value.types)
      ? value.types
      : {};

  const types = Object.fromEntries(
    NOTIFICATION_TYPES.map((type) => [
      type,
      typeof rawTypes[type] === "boolean"
        ? rawTypes[type]
        : DEFAULT_NOTIFICATION_PREFERENCES.types[type],
    ]),
  ) as Record<NotificationType, boolean>;

  return {
    enabledInBrowser:
      typeof value.enabledInBrowser === "boolean"
        ? value.enabledInBrowser
        : DEFAULT_NOTIFICATION_PREFERENCES.enabledInBrowser,
    enabledInEmail:
      typeof value.enabledInEmail === "boolean"
        ? value.enabledInEmail
        : DEFAULT_NOTIFICATION_PREFERENCES.enabledInEmail,
    types,
  };
}

/** Narrows an arbitrary `type` column value to a `NotificationType`. */
export function isNotificationType(value: string): value is NotificationType {
  return (NOTIFICATION_TYPES as readonly string[]).includes(value);
}
