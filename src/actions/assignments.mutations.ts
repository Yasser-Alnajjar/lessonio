"use server";

/**
 * Client-invokable assignment mutations, kept in a dedicated file
 * (file-level "use server", every export is an async function). Client
 * Components import this module directly (`@/actions/assignments.mutations`)
 * instead of the `@/actions` barrel — see `classes.mutations.ts` for why.
 */

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "./auth.guards";
import type { MutationResult } from "@/lib/types/common";
import type {
  CreateAssignmentInput,
  UpdateAssignmentInput,
} from "@/lib/types/assignment";
import type { Database } from "@/lib/types/database";

type AssignmentInsert = Database["public"]["Tables"]["assignments"]["Insert"];
type AssignmentUpdate = Database["public"]["Tables"]["assignments"]["Update"];

export async function createAssignment(
  input: CreateAssignmentInput,
): Promise<MutationResult> {
  const supabase = await createClient();
  const auth = await requireRole(supabase, "teacher");
  if ("error" in auth) return { success: false, error: auth.error };

  const payload: AssignmentInsert = {
    teacher_class_id: input.teacherClassId,
    teacher_id: auth.userId,
    title: input.title,
    instructions: input.instructions || null,
    due_at: new Date(input.dueAt).toISOString(),
    total_points: input.totalPoints,
  };

  const { error } = await supabase.from("assignments").insert(payload);
  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

/** `teacherClassId` is immutable — pinned by `enforce_assignment_pin()` — so it's never in this patch. */
export async function updateAssignment(
  id: string,
  input: UpdateAssignmentInput,
): Promise<MutationResult> {
  const supabase = await createClient();
  const auth = await requireRole(supabase, "teacher");
  if ("error" in auth) return { success: false, error: auth.error };

  const patch: AssignmentUpdate = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.instructions !== undefined)
    patch.instructions = input.instructions || null;
  if (input.dueAt !== undefined)
    patch.due_at = new Date(input.dueAt).toISOString();
  if (input.totalPoints !== undefined) patch.total_points = input.totalPoints;

  if (Object.keys(patch).length === 0) {
    return { success: true, error: null };
  }

  const { error } = await supabase
    .from("assignments")
    .update(patch)
    .eq("id", id)
    .eq("teacher_id", auth.userId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

/** Publishing is what "assigning work" means — drafts stay invisible to students until this runs. */
export async function publishAssignment(id: string): Promise<MutationResult> {
  const supabase = await createClient();
  const auth = await requireRole(supabase, "teacher");
  if ("error" in auth) return { success: false, error: auth.error };

  const { error } = await supabase
    .from("assignments")
    .update({ status: "published", published_at: new Date().toISOString() })
    .eq("id", id)
    .eq("teacher_id", auth.userId);

  if (error) {
    return { success: false, error: error.message };
  }

  // Best-effort: a notification failure must never block the publish itself
  // (the assignment is already live for students either way).
  const { error: notifyError } = await supabase.rpc(
    "notify_assignment_published",
    { p_assignment_id: id },
  );
  if (notifyError) {
    console.error("[publishAssignment] notify_assignment_published failed", {
      assignmentId: id,
      error: notifyError,
    });
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

/** Pulls a published assignment back to draft — it disappears from students immediately. */
export async function unpublishAssignment(id: string): Promise<MutationResult> {
  const supabase = await createClient();
  const auth = await requireRole(supabase, "teacher");
  if ("error" in auth) return { success: false, error: auth.error };

  const { error } = await supabase
    .from("assignments")
    .update({ status: "draft", published_at: null })
    .eq("id", id)
    .eq("teacher_id", auth.userId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

export async function deleteAssignment(id: string): Promise<MutationResult> {
  const supabase = await createClient();
  const auth = await requireRole(supabase, "teacher");
  if ("error" in auth) return { success: false, error: auth.error };

  const { error } = await supabase
    .from("assignments")
    .delete()
    .eq("id", id)
    .eq("teacher_id", auth.userId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/", "layout");
  return { success: true, error: null };
}
