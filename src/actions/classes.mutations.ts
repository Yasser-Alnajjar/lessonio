"use server";

/**
 * Client-invokable class mutations, kept in a dedicated file (file-level
 * "use server", every export is an async function — required by Next.js).
 * Client Components import this module directly (`@/actions/classes.mutations`)
 * instead of the `@/actions` barrel. `src/actions/classes.ts` re-exports
 * these under `Actions.Classes.*` for SSR use. Same pattern as
 * `lessons.mutations.ts`.
 */

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { MutationResult } from "@/lib/types/common";
import type { CreateClassInput, UpdateClassInput } from "@/lib/types/class";
import type { Database } from "@/lib/types/database";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type ClassUpdate = Database["public"]["Tables"]["classes"]["Update"];

async function getAuthedUserId(
  supabase: SupabaseServerClient,
): Promise<{ userId: string } | { error: string }> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { error: "You must be signed in." };
  }
  return { userId: data.user.id };
}

export async function createClass(input: CreateClassInput): Promise<MutationResult> {
  const supabase = await createClient();
  const auth = await getAuthedUserId(supabase);
  if ("error" in auth) return { success: false, error: auth.error };

  const { error } = await supabase.from("classes").insert({
    user_id: auth.userId,
    subject_id: input.subjectId,
    class_schedule_id: input.classScheduleId || null,
    date: input.date,
    start_time: input.startTime,
    duration_minutes: input.durationMinutes,
    teacher: input.teacher || null,
    location: input.location || null,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

/** Sole writer of `attendance_status`/`exam_status` for a class occurrence. */
export async function updateClass(
  id: string,
  input: UpdateClassInput,
): Promise<MutationResult> {
  const supabase = await createClient();
  const auth = await getAuthedUserId(supabase);
  if ("error" in auth) return { success: false, error: auth.error };

  const patch: ClassUpdate = {};
  if (input.subjectId !== undefined) patch.subject_id = input.subjectId;
  if (input.classScheduleId !== undefined)
    patch.class_schedule_id = input.classScheduleId || null;
  if (input.date !== undefined) patch.date = input.date;
  if (input.startTime !== undefined) patch.start_time = input.startTime;
  if (input.durationMinutes !== undefined) patch.duration_minutes = input.durationMinutes;
  if (input.teacher !== undefined) patch.teacher = input.teacher || null;
  if (input.location !== undefined) patch.location = input.location || null;
  if (input.attendanceStatus !== undefined) patch.attendance_status = input.attendanceStatus;
  if (input.examStatus !== undefined) patch.exam_status = input.examStatus;

  if (Object.keys(patch).length === 0) {
    return { success: true, error: null };
  }

  const { error } = await supabase
    .from("classes")
    .update(patch)
    .eq("id", id)
    .eq("user_id", auth.userId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

/** Deletes the class row. Lessons linked via `class_id` fall back to `null` (`on delete set null`). */
export async function deleteClass(id: string): Promise<MutationResult> {
  const supabase = await createClient();
  const auth = await getAuthedUserId(supabase);
  if ("error" in auth) return { success: false, error: auth.error };

  const { error } = await supabase
    .from("classes")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.userId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/", "layout");
  return { success: true, error: null };
}
