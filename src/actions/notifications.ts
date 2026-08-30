import "server-only";

import { axios } from "@/lib/client";
import { getApiErrorMessage } from "@/lib/client/errors";
import {
  mapNotificationRow,
  type BackendNotification,
} from "@/lib/notifications/map";
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
      const { data } = await axios.get<{ data: BackendNotification[] }>(
        "/api/v1/notifications",
      );
      return { data: data.data.map(mapNotificationRow), error: null };
    } catch (error) {
      // Distinguish "empty" from "backend/network failure" — a caller that
      // inspects `.error` needs this to render a real error state instead
      // of silently looking identical to "you're all caught up".
      return { data: null, error: getApiErrorMessage(error) };
    }
  },

  getRecent: getRecentNotifications,
  markAsRead: markNotificationAsRead,
  markAllAsRead: markAllNotificationsAsRead,
  sendToEmail: sendNotificationToEmail,
};
