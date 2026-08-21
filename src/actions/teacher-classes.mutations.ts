"use server";

/**
 * Client-invokable teacher-class mutations, kept in a dedicated file
 * (file-level "use server", every export is an async function). Client
 * Components import this module directly (`@/actions/teacher-classes.mutations`)
 * instead of the `@/actions` barrel — see `classes.mutations.ts` for why.
 */

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "./auth.guards";
import type { MutationResult, ActionResult } from "@/lib/types/common";
import type {
  CreateTeacherClassInput,
  UpdateTeacherClassInput,
} from "@/lib/types/teacher-class";
import type { Database } from "@/lib/types/database";

type TeacherClassUpdate =
  Database["public"]["Tables"]["teacher_classes"]["Update"];

/** `create_teacher_class()` inserts the class and its join code in one transaction. */
export async function createTeacherClass(
  input: CreateTeacherClassInput,
): Promise<MutationResult> {
  const supabase = await createClient();
  const auth = await requireRole(supabase, "teacher");
  if ("error" in auth) return { success: false, error: auth.error };

  const { error } = await supabase.rpc("create_teacher_class", {
    p_name: input.name,
    p_subject_label: input.subjectLabel || undefined,
    p_description: input.description || undefined,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

export async function updateTeacherClass(
  id: string,
  input: UpdateTeacherClassInput,
): Promise<MutationResult> {
  const supabase = await createClient();
  const auth = await requireRole(supabase, "teacher");
  if ("error" in auth) return { success: false, error: auth.error };

  const patch: TeacherClassUpdate = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.subjectLabel !== undefined)
    patch.subject_label = input.subjectLabel || null;
  if (input.description !== undefined)
    patch.description = input.description || null;
  if (input.isArchived !== undefined) patch.is_archived = input.isArchived;

  if (Object.keys(patch).length === 0) {
    return { success: true, error: null };
  }

  const { error } = await supabase
    .from("teacher_classes")
    .update(patch)
    .eq("id", id)
    .eq("teacher_id", auth.userId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

/** Flips `is_archived`. Archiving hides a class from active use without deleting its roster/history. */
export async function toggleArchivedTeacherClass(
  id: string,
): Promise<MutationResult> {
  const supabase = await createClient();
  const auth = await requireRole(supabase, "teacher");
  if ("error" in auth) return { success: false, error: auth.error };

  const { data: current, error: fetchError } = await supabase
    .from("teacher_classes")
    .select("is_archived")
    .eq("id", id)
    .eq("teacher_id", auth.userId)
    .maybeSingle();

  if (fetchError) return { success: false, error: fetchError.message };
  if (!current) return { success: false, error: "Class not found." };

  const { error } = await supabase
    .from("teacher_classes")
    .update({ is_archived: !current.is_archived })
    .eq("id", id)
    .eq("teacher_id", auth.userId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

/**
 * Deletes the class permanently. Its join code and enrollments go with it
 * via `ON DELETE CASCADE` — there is no "undo" once a teacher deletes a
 * class, unlike leaving/removing a single student.
 */
export async function deleteTeacherClass(id: string): Promise<MutationResult> {
  const supabase = await createClient();
  const auth = await requireRole(supabase, "teacher");
  if ("error" in auth) return { success: false, error: auth.error };

  const { error } = await supabase
    .from("teacher_classes")
    .delete()
    .eq("id", id)
    .eq("teacher_id", auth.userId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

export async function rotateJoinCode(
  classId: string,
): Promise<ActionResult<string>> {
  const supabase = await createClient();
  const auth = await requireRole(supabase, "teacher");
  if ("error" in auth) return { data: null, error: auth.error };

  const { data, error } = await supabase.rpc("rotate_join_code", {
    p_class_id: classId,
  });

  if (error) {
    return { data: null, error: error.message };
  }

  revalidatePath("/", "layout");
  return { data, error: null };
}
