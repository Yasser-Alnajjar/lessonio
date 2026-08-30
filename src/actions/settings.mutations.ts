"use server";

/**
 * Client-invokable settings Server Actions (file-level "use server", every
 * export is an async function — required by Next.js). `src/actions/settings.ts`
 * re-exports these under `Actions.Settings.*` for SSR use. Same pattern as
 * `auth.mutations.ts` and `subjects.mutations.ts`.
 */

import { revalidatePath } from "next/cache";

import { signOut } from "@auth";
import { axios } from "@/lib/client";
import { getApiErrorMessage } from "@/lib/client/errors";
import type { ActionResult, MutationResult } from "@/lib/types/common";
import type { GradeScaleEntry } from "@/lib/types/grade";
import type {
  NotificationPreferences,
  UserDataExport,
} from "@/lib/types/settings";

const MAX_GRADE_POINTS = 4.3;

/** The client only ever submits a form-shaped array — re-validate range and ordering before sending regardless (the backend re-validates too). */
function isValidGradeScale(scale: GradeScaleEntry[]): boolean {
  if (scale.length === 0) return false;

  return scale.every((entry, index) => {
    const inRange =
      entry.letter.length > 0 &&
      entry.letter.length <= 2 &&
      entry.minPercent >= 0 &&
      entry.minPercent <= 100 &&
      entry.gradePoints >= 0 &&
      entry.gradePoints <= MAX_GRADE_POINTS;
    if (!inRange) return false;

    // Each entry's threshold must be strictly lower than the previous one.
    const previous = scale[index - 1];
    return index === 0 || !previous || entry.minPercent < previous.minPercent;
  });
}

export async function updateGradeScale(
  scale: GradeScaleEntry[],
): Promise<MutationResult> {
  if (!isValidGradeScale(scale)) {
    return { success: false, error: "Invalid grade scale." };
  }

  try {
    await axios.patch("/api/v1/settings/grade-scale", { gradeScale: scale });
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

export async function updateNotificationPreferences(
  preferences: NotificationPreferences,
): Promise<MutationResult> {
  // Whole-object write rather than a jsonb merge: the UI always submits the
  // complete, defaults-filled shape (see parseNotificationPreferences), so
  // there's no partial state to preserve.
  try {
    await axios.patch("/api/v1/settings/notification-preferences", preferences);
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

/** Dumps every row the signed-in user owns into one JSON-serializable object ("download my data"). */
export async function exportData(): Promise<ActionResult<UserDataExport>> {
  try {
    const { data } = await axios.get<{ data: UserDataExport }>(
      "/api/v1/settings/export",
    );
    return { data: data.data, error: null };
  } catch (error) {
    return { data: null, error: getApiErrorMessage(error) };
  }
}

/**
 * Permanently deletes the signed-in user's account (API_CONTRACT.md
 * USER-003). Laravel refuses with `409 {"message":"teacher_has_classes"}`
 * when the user still owns `teacher_classes` rows — same sentinel string
 * the UI already maps to a translated message, so that check stays
 * server-side now instead of being a separate query here.
 */
export async function deleteAccount(): Promise<MutationResult> {
  try {
    await axios.delete("/api/v1/users/me");
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  await signOut({ redirect: false });
  revalidatePath("/", "layout");
  return { success: true, error: null };
}
