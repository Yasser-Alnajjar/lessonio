import type { Database } from "@/lib/types/database";
import type { Notification } from "@/lib/types/notification";
import { isNotificationType } from "./preferences";

type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

/**
 * snake_case row → camelCase domain type, mirroring `mapHomeworkRow` in
 * `src/actions/homework.ts`. It lives in `lib/` rather than beside its callers
 * because `notifications.mutations.ts` is a `"use server"` module, where every
 * export must be an async function.
 */
export function mapNotificationRow(row: NotificationRow): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    // The column is a plain `text` with a CHECK constraint, so narrow it back
    // to the union rather than asserting — an unrecognized value degrades to
    // a daily reminder instead of breaking the icon lookup in the UI.
    type: isNotificationType(row.type) ? row.type : "daily_reminder",
    title: row.title,
    body: row.body,
    readAt: row.read_at,
    linkPath: row.link_path,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
