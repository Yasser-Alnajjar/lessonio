"use server";

/**
 * Client-invokable settings Server Actions. Only the notification-preferences
 * slice is implemented — it's what Phase 14 depends on. The rest of Settings
 * (theme, locale, export, delete account) lands in Phase 16; see the stubs in
 * `src/actions/settings.ts`.
 */

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { MutationResult } from "@/lib/types/common";
import type { NotificationPreferences } from "@/lib/types/settings";

export async function updateNotificationPreferences(
  preferences: NotificationPreferences,
): Promise<MutationResult> {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    return { success: false, error: "You must be signed in." };
  }

  // Whole-object write rather than a jsonb merge: the UI always submits the
  // complete, defaults-filled shape (see parseNotificationPreferences), so
  // there's no partial state to preserve.
  const { error } = await supabase
    .from("settings")
    .update({ notification_preferences: { ...preferences } })
    .eq("user_id", authData.user.id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/", "layout");
  return { success: true, error: null };
}
