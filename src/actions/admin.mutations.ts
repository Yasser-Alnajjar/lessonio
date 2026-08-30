"use server";

/**
 * Client-invokable admin Server Actions (file-level "use server"). Every
 * export is an async function, per Next.js. `src/actions/admin.ts`
 * re-exports these under `Actions.Admin.*` for SSR use — same split as
 * `settings.ts`/`settings.mutations.ts`.
 */

import { revalidatePath } from "next/cache";

import { axios } from "@/lib/client";
import { getApiErrorMessage } from "@/lib/client/errors";
import type { MutationResult } from "@/lib/types/common";
import type {
  NotificationPolicyEntry,
  NotificationTiming,
} from "@/lib/types/notification-policy";
import { requireRole } from "./auth.guards";

export interface UpdateNotificationPolicyInput {
  enabled: boolean;
  channels: string[];
  recipientRules: string[];
  timing: NotificationTiming;
  offsetMinutes: number | null;
}

export async function updateNotificationPolicy(
  type: NotificationPolicyEntry["type"],
  input: UpdateNotificationPolicyInput,
): Promise<MutationResult> {
  const guard = await requireRole("admin");
  if ("error" in guard) {
    return { success: false, error: guard.error };
  }

  try {
    await axios.patch(
      `/api/v1/admin/notification-settings/${encodeURIComponent(type)}`,
      input,
    );
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}
