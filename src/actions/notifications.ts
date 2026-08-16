import "server-only";

import { mapNotificationRow } from "@/lib/notifications/map";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/common";
import type { Notification } from "@/lib/types/notification";
import { ensureNotificationsForUser } from "./notifications.generate";
import {
  getRecentNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  sendNotificationToEmail,
} from "./notifications.mutations";

/** How many notifications the center renders — older ones age out silently. */
const CENTER_LIMIT = 50;

/** SSR-facing surface for `Actions.Notifications.*`. Mutations re-export the real Server Actions. */
export const notificationsActions = {
  async getAll(): Promise<ActionResult<Notification[]>> {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return { data: [], error: null };
    }

    // The center is the one place a user goes specifically to read
    // notifications, so bring them up to date before listing.
    await ensureNotificationsForUser(supabase, authData.user.id, authData.user.email ?? null);

    const { data: rows, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", authData.user.id)
      .order("created_at", { ascending: false })
      .limit(CENTER_LIMIT);

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: (rows ?? []).map(mapNotificationRow), error: null };
  },

  async getUnreadCount(): Promise<ActionResult<number>> {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return { data: 0, error: null };
    }

    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", authData.user.id)
      .is("read_at", null);

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: count ?? 0, error: null };
  },

  getRecent: getRecentNotifications,
  markAsRead: markNotificationAsRead,
  markAllAsRead: markAllNotificationsAsRead,
  sendToEmail: sendNotificationToEmail,
};
