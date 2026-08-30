import type { Notification } from "@/lib/types/notification";
import { isNotificationType } from "./preferences";

export interface BackendNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  entityType: string | null;
  entityId: string | null;
  readAt: string | null;
  linkPath: string | null;
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
    // degrades to the daily digest instead of breaking the icon lookup.
    type: isNotificationType(row.type) ? row.type : "digest.daily",
    title: row.title,
    body: row.body,
    data: row.data ?? {},
    entityType: row.entityType,
    entityId: row.entityId,
    readAt: row.readAt,
    linkPath: row.linkPath,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
