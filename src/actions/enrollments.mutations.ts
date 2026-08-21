"use server";

/**
 * Client-invokable enrollment mutations, kept in a dedicated file
 * (file-level "use server", every export is an async function). Client
 * Components import this module directly (`@/actions/enrollments.mutations`)
 * instead of the `@/actions` barrel — see `classes.mutations.ts` for why.
 */

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "./auth.guards";
import type { ActionResult, MutationResult } from "@/lib/types/common";

/**
 * `join_class_by_code()` normalizes the code, guards the student role, and
 * upserts the enrollment (re-joining after leaving is idempotent). Returns
 * `invalid_join_code` as a plain error string for a wrong/unknown code —
 * never a stack trace the student would see.
 */
export async function joinClass(code: string): Promise<ActionResult<string>> {
  const supabase = await createClient();
  const auth = await requireRole(supabase, "student");
  if ("error" in auth) return { data: null, error: auth.error };

  const { data, error } = await supabase.rpc("join_class_by_code", {
    p_code: code,
  });

  if (error) {
    return { data: null, error: error.message };
  }

  revalidatePath("/", "layout");
  return { data, error: null };
}

/**
 * Sets the caller's own enrollment to "removed" — never deletes, so
 * historical submissions (Phase 4) survive a student leaving.
 */
export async function leaveClass(classId: string): Promise<MutationResult> {
  const supabase = await createClient();
  const auth = await requireRole(supabase, "student");
  if ("error" in auth) return { success: false, error: auth.error };

  const { error } = await supabase.rpc("leave_class", { p_class_id: classId });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

/**
 * Teacher-only: sets a student's enrollment back to "removed". Allowed by
 * the `class_enrollments` UPDATE policy (teacher of the class only) — a
 * plain update, not an RPC, since RLS already scopes it correctly.
 */
export async function removeStudent(
  classId: string,
  studentId: string,
): Promise<MutationResult> {
  const supabase = await createClient();
  const auth = await requireRole(supabase, "teacher");
  if ("error" in auth) return { success: false, error: auth.error };

  const { error } = await supabase
    .from("class_enrollments")
    .update({ status: "removed" })
    .eq("teacher_class_id", classId)
    .eq("student_id", studentId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/", "layout");
  return { success: true, error: null };
}
