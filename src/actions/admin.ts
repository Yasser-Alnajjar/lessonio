import "server-only";

import { axios } from "@/lib/client";
import type { ActionResult } from "@/lib/types/common";
import type { NotificationPolicyEntry } from "@/lib/types/notification-policy";
import { updateNotificationPolicy } from "./admin.mutations";

export const adminActions = {
  async getNotificationSettings(): Promise<
    ActionResult<NotificationPolicyEntry[]>
  > {
    try {
      const { data } = await axios.get<{ data: NotificationPolicyEntry[] }>(
        "/api/v1/admin/notification-settings",
      );
      return { data: data.data, error: null };
    } catch {
      return { data: null, error: null };
    }
  },

  updateNotificationPolicy,
};
