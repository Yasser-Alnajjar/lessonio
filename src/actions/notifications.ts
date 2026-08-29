import "server-only";

import { axios } from "@/lib/client";
import { mapNotificationRow, type BackendNotification } from "@/lib/notifications/map";
import type { ActionResult } from "@/lib/types/common";
import type { Notification } from "@/lib/types/notification";
import {
  getRecentNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  sendNotificationToEmail,
} from "./notifications.mutations";

/** SSR-facing surface for `Actions.Notifications.*`. Mutations re-export the real Server Actions. */
export const notificationsActions = {
  async getAll(): Promise<ActionResult<Notification[]>> {
    try {
      const { data } = await axios.get<{ data: BackendNotification[] }>("/api/v1/notifications");
      return { data: data.data.map(mapNotificationRow), error: null };
    } catch {
      return { data: null, error: null };
    }
  },

  async getUnreadCount(): Promise<ActionResult<number>> {
    try {
      const { data } = await axios.get<{ data: number }>("/api/v1/notifications/unread-count");
      return { data: data.data, error: null };
    } catch {
      return { data: 0, error: null };
    }
  },

  getRecent: getRecentNotifications,
  markAsRead: markNotificationAsRead,
  markAllAsRead: markAllNotificationsAsRead,
  sendToEmail: sendNotificationToEmail,
};
