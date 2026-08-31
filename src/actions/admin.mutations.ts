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
import type { AppRole } from "@/lib/types/user";
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

/**
 * `changeUserRole`, not `promoteUserRole` — the admin can move a user in
 * either direction (student→teacher, teacher→admin, admin→student, ...).
 * The backend rejects a self-role change with 403 unconditionally; the UI
 * should also hide the action on the signed-in admin's own row (see
 * `ChangeRoleDialog`'s caller in `columns.tsx`).
 */
export async function changeUserRole(
  userId: string,
  role: AppRole,
): Promise<MutationResult> {
  const auth = await requireRole("admin");
  if ("error" in auth) return { success: false, error: auth.error };

  try {
    await axios.post(`/api/v1/admin/users/${userId}/role`, { role });
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

/**
 * Takes an explicit `isArchived` rather than toggling — the clicked row on
 * a paginated dashboard may be stale, so a toggle would race two admins
 * archiving the same class into an unarchived end state.
 */
export async function setClassArchived(
  classId: string,
  isArchived: boolean,
): Promise<MutationResult> {
  const auth = await requireRole("admin");
  if ("error" in auth) return { success: false, error: auth.error };

  try {
    await axios.post(`/api/v1/admin/teacher-classes/${classId}/archive`, {
      isArchived,
    });
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

/** Cancels the assignment's pending due-soon jobs atomically with the status change (backend-side transaction). */
export async function unpublishAssignment(
  assignmentId: string,
): Promise<MutationResult> {
  const auth = await requireRole("admin");
  if ("error" in auth) return { success: false, error: auth.error };

  try {
    await axios.post(`/api/v1/admin/assignments/${assignmentId}/unpublish`);
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}
