"use server";

/**
 * Client-invokable calendar mutations, kept in a dedicated file (file-level
 * "use server", every export is an async function). Client Components import
 * this module directly (`@/actions/calendar.mutations`) instead of the
 * `@/actions` barrel. `src/actions/calendar.ts` re-exports this under
 * `Actions.Calendar.rescheduleLesson` for SSR use. Same pattern as
 * `lessons.mutations.ts`.
 */

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { MutationResult } from "@/lib/types/common";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

async function getAuthedUserId(
  supabase: SupabaseServerClient,
): Promise<{ userId: string } | { error: string }> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { error: "You must be signed in." };
  }
  return { userId: data.user.id };
}

/** Moves a lesson to a new date — the only calendar mutation, driven by drag-and-drop. */
export async function rescheduleLesson(lessonId: string, newDate: string): Promise<MutationResult> {
  const supabase = await createClient();
  const auth = await getAuthedUserId(supabase);
  if ("error" in auth) return { success: false, error: auth.error };

  const { error } = await supabase
    .from("lessons")
    .update({ date: newDate })
    .eq("id", lessonId)
    .eq("user_id", auth.userId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/", "layout");
  return { success: true, error: null };
}
