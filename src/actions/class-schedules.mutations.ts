"use server";

/**
 * Client-invokable class-schedule mutations, kept in a dedicated file
 * (file-level "use server", every export is an async function — required
 * by Next.js). Client Components import this module directly
 * (`@/actions/class-schedules.mutations`) instead of the `@/actions`
 * barrel, so they never pull in the other domains' still-`server-only`
 * stub actions into the client bundle. `src/actions/class-schedules.ts`
 * re-exports these under `Actions.ClassSchedules.*` for SSR use. Same
 * pattern as `lessons.mutations.ts`.
 */

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { MutationResult } from "@/lib/types/common";
import type {
  CreateClassScheduleInput,
  UpdateClassScheduleInput,
} from "@/lib/types/class-schedule";
import type { Database, Json } from "@/lib/types/database";
import { deleteFutureUntouchedOccurrences } from "./classes.generate";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type ClassScheduleUpdate =
  Database["public"]["Tables"]["class_schedules"]["Update"];

async function getAuthedUserId(
  supabase: SupabaseServerClient,
): Promise<{ userId: string } | { error: string }> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { error: "You must be signed in." };
  }
  return { userId: data.user.id };
}

export async function createClassSchedule(
  input: CreateClassScheduleInput,
): Promise<MutationResult> {
  const supabase = await createClient();
  const auth = await getAuthedUserId(supabase);
  if ("error" in auth) return { success: false, error: auth.error };

  const { error } = await supabase.from("class_schedules").insert({
    user_id: auth.userId,
    subject_id: input.subjectId,
    teacher: input.teacher || null,
    location: input.location || null,
    // Plain data shape, structurally JSON-safe — the `unknown` hop is only
    // to satisfy the generated `Json` type, which lacks an index signature
    // for named interfaces.
    schedules: input.schedules as unknown as Json,
    starts_on: input.startsOn,
    ends_on: input.endsOn || null,
    ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

export async function updateClassSchedule(
  id: string,
  input: UpdateClassScheduleInput,
): Promise<MutationResult> {
  const supabase = await createClient();
  const auth = await getAuthedUserId(supabase);
  if ("error" in auth) return { success: false, error: auth.error };

  const patch: ClassScheduleUpdate = {};
  if (input.subjectId !== undefined) patch.subject_id = input.subjectId;
  if (input.teacher !== undefined) patch.teacher = input.teacher || null;
  if (input.location !== undefined) patch.location = input.location || null;
  if (input.schedules !== undefined)
    patch.schedules = input.schedules as unknown as Json;
  if (input.startsOn !== undefined) patch.starts_on = input.startsOn;
  if (input.endsOn !== undefined) patch.ends_on = input.endsOn || null;
  if (input.isActive !== undefined) patch.is_active = input.isActive;

  if (Object.keys(patch).length === 0) {
    return { success: true, error: null };
  }

  const { error } = await supabase
    .from("class_schedules")
    .update(patch)
    .eq("id", id)
    .eq("user_id", auth.userId);

  if (error) {
    return { success: false, error: error.message };
  }

  // The schedule's shape may have changed (days, times, teacher, location),
  // so future occurrences nobody has touched yet are cleared and left for
  // the next ensureClassesForUser() to re-materialize from the new template.
  await deleteFutureUntouchedOccurrences(supabase, id);

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

/** Flips `is_active`. Deactivating pauses the schedule without deleting it. */
export async function toggleActiveClassSchedule(
  id: string,
): Promise<MutationResult> {
  const supabase = await createClient();
  const auth = await getAuthedUserId(supabase);
  if ("error" in auth) return { success: false, error: auth.error };

  const { data: current, error: fetchError } = await supabase
    .from("class_schedules")
    .select("is_active")
    .eq("id", id)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (fetchError) return { success: false, error: fetchError.message };
  if (!current) return { success: false, error: "Class not found." };

  const { error } = await supabase
    .from("class_schedules")
    .update({ is_active: !current.is_active })
    .eq("id", id)
    .eq("user_id", auth.userId);

  if (error) return { success: false, error: error.message };

  // Deactivating stops future materialization, so untouched future
  // occurrences are cleared too — see deleteFutureUntouchedOccurrences().
  // Reactivating needs no cleanup: the next ensureClassesForUser() just
  // resumes materializing forward from today.
  if (current.is_active) {
    await deleteFutureUntouchedOccurrences(supabase, id);
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

/** Deletes the class schedule row permanently. */
export async function deleteClassSchedule(id: string): Promise<MutationResult> {
  const supabase = await createClient();
  const auth = await getAuthedUserId(supabase);
  if ("error" in auth) return { success: false, error: auth.error };

  // No template survives to re-materialize from, so future untouched
  // occurrences are cleared here rather than left to `on delete set null`.
  await deleteFutureUntouchedOccurrences(supabase, id);

  const { error } = await supabase
    .from("class_schedules")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.userId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/", "layout");
  return { success: true, error: null };
}
