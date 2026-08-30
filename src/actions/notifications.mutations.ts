"use server";

/**
 * Client-invokable notification Server Actions, kept in a dedicated file
 * (file-level "use server", every export is an async function). Client
 * Components import this module directly
 * (`@/actions/notifications.mutations`) instead of the `@/actions` barrel.
 * `src/actions/notifications.ts` re-exports these under `Actions.Notifications.*`
 * for SSR use. Same pattern as `homework.mutations.ts`.
 *
 * `getRecent` is a read rather than a write, but it lives here because this
 * file's real subject is "things a Client Component may call" — the
 * notification bell polls it on an interval.
 */

import { revalidatePath } from "next/cache";

import { axios } from "@/lib/client";
import { getApiErrorMessage } from "@/lib/client/errors";
import {
  mapNotificationRow,
  type BackendNotification,
} from "@/lib/notifications/map";
import type { ActionResult, MutationResult } from "@/lib/types/common";
import type { Notification } from "@/lib/types/notification";

export interface RecentNotifications {
  items: Notification[];
  unreadCount: number;
}

/**
 * Polled by the notification bell — returns the latest few plus the badge
 * count. A plain read: notification rows come from the event-driven
 * backend pipeline (a domain event, or a scheduled job drained by cron),
 * never from this endpoint.
 */
export async function getRecentNotifications(): Promise<
  ActionResult<RecentNotifications>
> {
  try {
    const { data } = await axios.get<{
      data: { items: BackendNotification[]; unreadCount: number };
    }>("/api/v1/notifications/recent");
    return {
      data: {
        items: data.data.items.map(mapNotificationRow),
        unreadCount: data.data.unreadCount,
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error: getApiErrorMessage(error) };
  }
}

export async function markNotificationAsRead(
  id: string,
): Promise<MutationResult> {
  try {
    await axios.post(`/api/v1/notifications/${id}/read`);
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

export async function markAllNotificationsAsRead(): Promise<MutationResult> {
  try {
    await axios.post("/api/v1/notifications/read-all");
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

/**
 * Emails a single notification to the signed-in user on demand. Both the
 * notification and the recipient address are resolved server-side from the
 * session — this action never accepts or forwards a recipient.
 */
export async function sendNotificationToEmail(
  id: string,
): Promise<MutationResult> {
  try {
    await axios.post(`/api/v1/notifications/${id}/email`);
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  return { success: true, error: null };
}
