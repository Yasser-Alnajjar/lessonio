import type { Json } from "@/lib/types/common";
import {
  NOTIFICATION_TYPES,
  type NotificationType,
} from "@/lib/types/notification";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationPreferences,
  type NotificationTypePreference,
} from "@/lib/types/settings";

/**
 * `settings.notification_preferences` is a jsonb column, so Postgres types it
 * as unstructured `Json`. Rows provisioned before a preference key existed
 * simply won't have it — parse defensively and fill from the defaults rather
 * than trusting the shape.
 */
export function parseNotificationPreferences(
  value: Json | null,
): NotificationPreferences {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }

  const rawChannels =
    typeof value.channels === "object" &&
    value.channels !== null &&
    !Array.isArray(value.channels)
      ? value.channels
      : {};

  const rawTypes =
    typeof value.types === "object" &&
    value.types !== null &&
    !Array.isArray(value.types)
      ? value.types
      : {};

  const types = Object.fromEntries(
    NOTIFICATION_TYPES.map((type) => {
      const rawEntry = rawTypes[type];
      const fallback = DEFAULT_NOTIFICATION_PREFERENCES.types[type];
      const entry: NotificationTypePreference =
        typeof rawEntry === "object" &&
        rawEntry !== null &&
        !Array.isArray(rawEntry)
          ? {
              in_app:
                typeof rawEntry.in_app === "boolean"
                  ? rawEntry.in_app
                  : fallback.in_app,
              email:
                typeof rawEntry.email === "boolean"
                  ? rawEntry.email
                  : fallback.email,
            }
          : fallback;

      return [type, entry];
    }),
  ) as Record<NotificationType, NotificationTypePreference>;

  return {
    channels: {
      in_app:
        typeof rawChannels.in_app === "boolean"
          ? rawChannels.in_app
          : DEFAULT_NOTIFICATION_PREFERENCES.channels.in_app,
      email:
        typeof rawChannels.email === "boolean"
          ? rawChannels.email
          : DEFAULT_NOTIFICATION_PREFERENCES.channels.email,
      push:
        typeof rawChannels.push === "boolean"
          ? rawChannels.push
          : DEFAULT_NOTIFICATION_PREFERENCES.channels.push,
    },
    types,
  };
}

/** Narrows an arbitrary `type` column value to a `NotificationType`. */
export function isNotificationType(value: string): value is NotificationType {
  return (NOTIFICATION_TYPES as readonly string[]).includes(value);
}
