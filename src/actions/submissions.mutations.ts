"use server";

/**
 * Client-invokable submission mutations, kept in a dedicated file
 * (file-level "use server", every export is an async function). Client
 * Components import this module directly (`@/actions/submissions.mutations`)
 * instead of the `@/actions` barrel — see `classes.mutations.ts` for why.
 */

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "./auth.guards";
import type { MutationResult } from "@/lib/types/common";
import type {
  GradeSubmissionInput,
  SubmitAssignmentInput,
} from "@/lib/types/submission";
import type { Database } from "@/lib/types/database";

type SubmissionInsert =
  Database["public"]["Tables"]["assignment_submissions"]["Insert"];
type SubmissionUpdate =
  Database["public"]["Tables"]["assignment_submissions"]["Update"];

/**
 * Upserts on (assignment_id, student_id): a first call inserts, a later
 * call before grading resubmits by updating the same row. RLS backs both
 * paths — insert requires `can_submit_assignment()`, update requires the
 * caller to be the submitting student — and `enforce_submission_write_scope()`
 * blocks the update once `graded_at` is set.
 */
export async function submitAssignment(
  assignmentId: string,
  input: SubmitAssignmentInput,
): Promise<MutationResult> {
  const supabase = await createClient();
  const auth = await requireRole(supabase, "student");
  if ("error" in auth) return { success: false, error: auth.error };

  const payload: SubmissionInsert = {
    assignment_id: assignmentId,
    student_id: auth.userId,
    content: input.content,
    submitted_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("assignment_submissions")
    .upsert(payload, { onConflict: "assignment_id,student_id" });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

/**
 * `graded_by`/`graded_at` are never sent here — `enforce_submission_write_scope()`
 * stamps them itself, and the trigger also validates `score` against the
 * assignment's `total_points` server-side.
 */
export async function gradeSubmission(
  submissionId: string,
  input: GradeSubmissionInput,
): Promise<MutationResult> {
  const supabase = await createClient();
  const auth = await requireRole(supabase, "teacher");
  if ("error" in auth) return { success: false, error: auth.error };

  const patch: SubmissionUpdate = {
    score: input.score,
    feedback: input.feedback || null,
  };

  const { error } = await supabase
    .from("assignment_submissions")
    .update(patch)
    .eq("id", submissionId);

  if (error) {
    return { success: false, error: error.message };
  }

  // Best-effort: a notification failure must never block the grade itself.
  const { error: notifyError } = await supabase.rpc(
    "notify_submission_graded",
    { p_submission_id: submissionId },
  );
  if (notifyError) {
    console.error("[gradeSubmission] notify_submission_graded failed", {
      submissionId,
      error: notifyError,
    });
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}
