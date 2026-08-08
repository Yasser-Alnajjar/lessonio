"use server";

/**
 * Client-invokable settings Server Actions (file-level "use server", every
 * export is an async function — required by Next.js). `src/actions/settings.ts`
 * re-exports these under `Actions.Settings.*` for SSR use. Same pattern as
 * `auth.mutations.ts` and `subjects.mutations.ts`.
 */

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, MutationResult } from "@/lib/types/common";
import type { NotificationPreferences, UserDataExport } from "@/lib/types/settings";

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

/**
 * Dumps every row the signed-in user owns into one JSON-serializable object.
 * Uses the per-user client rather than the admin one — every table's SELECT
 * policy already scopes to `auth.uid()`, so there's nothing to gain (and RLS
 * to bypass) by reaching for elevated access here.
 */
export async function exportData(): Promise<ActionResult<UserDataExport>> {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    return { data: null, error: "You must be signed in." };
  }

  const userId = authData.user.id;

  const [
    profile,
    settings,
    subjects,
    lessons,
    lessonNotes,
    attachments,
    studySessions,
    homework,
    exams,
    tags,
    lessonTags,
    notifications,
    goals,
    achievements,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("settings").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("subjects").select("*").eq("user_id", userId),
    supabase.from("lessons").select("*").eq("user_id", userId),
    supabase.from("lesson_notes").select("*").eq("user_id", userId),
    supabase.from("attachments").select("*").eq("user_id", userId),
    supabase.from("study_sessions").select("*").eq("user_id", userId),
    supabase.from("homework").select("*").eq("user_id", userId),
    supabase.from("exams").select("*").eq("user_id", userId),
    supabase.from("tags").select("*").eq("user_id", userId),
    // lesson_tags has no user_id column — scoped via the lessons join, so
    // this select relies entirely on its RLS policy to filter to own rows.
    supabase.from("lesson_tags").select("*"),
    supabase.from("notifications").select("*").eq("user_id", userId),
    supabase.from("goals").select("*").eq("user_id", userId),
    supabase.from("user_achievements").select("*").eq("user_id", userId),
  ]);

  const firstError = [
    profile,
    settings,
    subjects,
    lessons,
    lessonNotes,
    attachments,
    studySessions,
    homework,
    exams,
    tags,
    lessonTags,
    notifications,
    goals,
    achievements,
  ].find((result) => result.error)?.error;

  if (firstError) {
    return { data: null, error: firstError.message };
  }

  return {
    data: {
      exportedAt: new Date().toISOString(),
      profile: profile.data,
      settings: settings.data,
      subjects: subjects.data ?? [],
      lessons: lessons.data ?? [],
      lessonNotes: lessonNotes.data ?? [],
      attachments: attachments.data ?? [],
      studySessions: studySessions.data ?? [],
      homework: homework.data ?? [],
      exams: exams.data ?? [],
      tags: tags.data ?? [],
      lessonTags: lessonTags.data ?? [],
      notifications: notifications.data ?? [],
      goals: goals.data ?? [],
      achievements: achievements.data ?? [],
    },
    error: null,
  };
}

/**
 * Permanently deletes the signed-in user's `auth.users` row. Every domain
 * table (profiles, settings, subjects, lessons, ...) references it with
 * `on delete cascade`, so this single call is enough to erase all of a
 * user's data — see the migrations under supabase/migrations/.
 *
 * `auth.admin.deleteUser` requires the service-role client: no `authenticated`
 * policy can let a user delete their own `auth.users` row directly.
 */
export async function deleteAccount(): Promise<MutationResult> {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    return { success: false, error: "You must be signed in." };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(authData.user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  return { success: true, error: null };
}
