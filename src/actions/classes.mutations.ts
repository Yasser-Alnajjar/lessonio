"use server";

/**
 * Client-invokable class mutations, kept in a dedicated file (file-level
 * "use server", every export is an async function — required by Next.js).
 * Client Components import this module directly (`@/actions/classes.mutations`)
 * instead of the `@/actions` barrel, so they never pull in the other domains'
 * still-`server-only` stub actions into the client bundle.
 * `src/actions/classes.ts` re-exports these under `Actions.Classes.*` for SSR
 * use. Same pattern as `lessons.mutations.ts`.
 *
 * These act on the *recurring* class. Attendance and exam state belong to a
 * specific date and are written by
 * `src/actions/class-occurrences.mutations.ts`.
 */

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { MutationResult } from "@/lib/types/common";
import type { CreateClassInput, UpdateClassInput } from "@/lib/types/class";
import type { Database, Json } from "@/lib/types/database";
import {
  deleteFutureUntouchedOccurrences,
  resetClassOccurrencesMaterializedAt,
} from "./class-occurrences.generate";

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

export async function createClass(
  input: CreateClassInput,
): Promise<MutationResult> {
  const supabase = await createClient();
  const auth = await getAuthedUserId(supabase);
  if ("error" in auth) return { success: false, error: auth.error };

  const { error } = await supabase.from("classes").insert({
    user_id: auth.userId,
    subject_id: input.subjectId,
    teacher: input.teacher || null,
    location: input.location || null,
    // Plain data shape, structurally JSON-safe — the `unknown` hop is only
    // to satisfy the generated `Json` type, which lacks an index signature
    // for named interfaces.
    meetings: input.meetings as unknown as Json,
    ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
  });

  if (error) {
    return { success: false, error: error.message };
  }

  await resetClassOccurrencesMaterializedAt(supabase, auth.userId);

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

export async function updateClass(
  id: string,
  input: UpdateClassInput,
): Promise<MutationResult> {
  const supabase = await createClient();
  const auth = await getAuthedUserId(supabase);
  if ("error" in auth) return { success: false, error: auth.error };

  const patch: ClassUpdate = {};
  if (input.subjectId !== undefined) patch.subject_id = input.subjectId;
  if (input.teacher !== undefined) patch.teacher = input.teacher || null;
  if (input.location !== undefined) patch.location = input.location || null;
  if (input.meetings !== undefined)
    patch.meetings = input.meetings as unknown as Json;
  if (input.isActive !== undefined) patch.is_active = input.isActive;

  if (Object.keys(patch).length === 0) {
    return { success: true, error: null };
  }

  const { error } = await supabase
    .from("classes")
    .update(patch)
    .eq("id", id)
    .eq("user_id", auth.userId);

  if (error) {
    return { success: false, error: error.message };
  }

  // The class's shape may have changed (days, times, subject), so future
  // occurrences nobody has touched yet are cleared and left for the next
  // ensureClassOccurrencesForUser() to re-materialize from the new shape.
  await deleteFutureUntouchedOccurrences(supabase, id);
  await resetClassOccurrencesMaterializedAt(supabase, auth.userId);

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

/** Flips `is_active`. Deactivating pauses the class without deleting it. */
export async function toggleActiveClass(id: string): Promise<MutationResult> {
  const supabase = await createClient();
  const auth = await getAuthedUserId(supabase);
  if ("error" in auth) return { success: false, error: auth.error };

  const { data: current, error: fetchError } = await supabase
    .from("classes")
    .select("is_active")
    .eq("id", id)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (fetchError) return { success: false, error: fetchError.message };
  if (!current) return { success: false, error: "Class not found." };

  const { error } = await supabase
    .from("classes")
    .update({ is_active: !current.is_active })
    .eq("id", id)
    .eq("user_id", auth.userId);

  if (error) return { success: false, error: error.message };

  // Deactivating stops future materialization, so untouched future
  // occurrences are cleared too — see deleteFutureUntouchedOccurrences().
  if (current.is_active) {
    await deleteFutureUntouchedOccurrences(supabase, id);
  }

  // Either direction needs the stamp reset: reactivating must resume
  // materializing forward from today on the very next read rather than
  // waiting out the cooldown, and deactivating must not leave a stale stamp
  // masking some other class's changes during the same window.
  await resetClassOccurrencesMaterializedAt(supabase, auth.userId);

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

/**
 * Deletes the class permanently. Its occurrences — including any recorded
 * attendance and exam state — go with it via
 * `class_occurrences_class_id_fkey ON DELETE CASCADE`; an occurrence cannot
 * outlive the class it belongs to. Lessons linked to those occurrences are
 * *not* deleted: `lessons.class_occurrence_id` is ON DELETE SET NULL.
 */
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
