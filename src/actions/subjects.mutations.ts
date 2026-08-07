"use server";

/**
 * Client-invokable subject mutations, kept in a dedicated file (file-level
 * "use server", every export is an async function — required by Next.js).
 * Client Components import this module directly (`@/actions/subjects.mutations`)
 * instead of the `@/actions` barrel, so they never pull in the other
 * domains' still-`server-only` stub actions into the client bundle.
 * `src/actions/subjects.ts` re-exports these under `Actions.Subjects.*` for
 * SSR use. Same pattern as `auth.mutations.ts`.
 */

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { MutationResult } from "@/lib/types/common";
import type { CreateSubjectInput, UpdateSubjectInput } from "@/lib/types/subject";
import type { Database } from "@/lib/types/database";

type SubjectUpdate = Database["public"]["Tables"]["subjects"]["Update"];

export async function createSubject(input: CreateSubjectInput): Promise<MutationResult> {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    return { success: false, error: "You must be signed in." };
  }

  const { error } = await supabase.from("subjects").insert({
    user_id: authData.user.id,
    name: input.name,
    color: input.color,
    icon: input.icon,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

export async function updateSubject(
  id: string,
  input: UpdateSubjectInput,
): Promise<MutationResult> {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    return { success: false, error: "You must be signed in." };
  }

  const patch: SubjectUpdate = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.color !== undefined) patch.color = input.color;
  if (input.icon !== undefined) patch.icon = input.icon;
  if (input.isArchived !== undefined) patch.is_archived = input.isArchived;

  const { error } = await supabase
    .from("subjects")
    .update(patch)
    .eq("id", id)
    .eq("user_id", authData.user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

/**
 * Deletes the subject row. `subjects.id` cascades (on delete cascade) to
 * lessons, which in turn cascade to homework, exams, notes, and
 * attachments — the caller must warn about this before confirming.
 */
export async function deleteSubject(id: string): Promise<MutationResult> {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    return { success: false, error: "You must be signed in." };
  }

  const { error } = await supabase
    .from("subjects")
    .delete()
    .eq("id", id)
    .eq("user_id", authData.user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}
