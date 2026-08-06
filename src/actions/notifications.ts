import "server-only";

import type { ActionResult, MutationResult } from "@/lib/types/common";
import type { Notification } from "@/lib/types/notification";

/** TODO(Phase 14 — Notifications): replace stubs with Supabase queries. */
export const notificationsActions = {
  async getAll(): Promise<ActionResult<Notification[]>> {
    return { data: [], error: null };
  },

  async markAsRead(_id: string): Promise<MutationResult> {
    return { success: false, error: "Not implemented until Phase 14." };
  },
};
