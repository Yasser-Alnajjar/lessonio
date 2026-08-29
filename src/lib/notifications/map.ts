import type { Notification } from "@/lib/types/notification";
import { isNotificationType } from "./preferences";

export interface BackendNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  linkPath: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Backend JSON → domain type. It lives in `lib/` rather than beside its
 * callers because `notifications.mutations.ts` is a `"use server"` module,
 * where every export must be an async function.
 */
export function mapNotificationRow(row: BackendNotification): Notification {
  return {
    id: row.id,
    userId: row.userId,
    // The backend column is a plain `text` with a CHECK constraint, so narrow
    // it back to the union rather than asserting — an unrecognized value
    // (e.g. a type added by a migration this client doesn't know yet)
    // degrades to a daily reminder instead of breaking the icon lookup.
    type: isNotificationType(row.type) ? row.type : "daily_reminder",
    title: row.title,
    body: row.body,
    readAt: row.readAt,
    linkPath: row.linkPath,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
