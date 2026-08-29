"use server";

/**
 * Client-invokable submission mutations, kept in a dedicated file
 * (file-level "use server", every export is an async function). Client
 * Components import this module directly (`@/actions/submissions.mutations`)
 * instead of the `@/actions` barrel — see `classes.mutations.ts` for why.
 */

import { revalidatePath } from "next/cache";

import { axios } from "@/lib/client";
import { getApiErrorMessage } from "@/lib/client/errors";
import { requireRole } from "./auth.guards";
import type { MutationResult } from "@/lib/types/common";
import type {
  GradeSubmissionInput,
  SubmitAssignmentInput,
} from "@/lib/types/submission";

/**
 * `PUT classroom/assignments/{id}/submission` (SUBMIT-003) upserts on
 * `(assignment_id, student_id)` server-side: a first call inserts, a later
 * call before grading resubmits by updating the same row.
 * `submittedAt` is stamped server-side on every submit — never sent here.
 */
export async function submitAssignment(
  assignmentId: string,
  input: SubmitAssignmentInput,
): Promise<MutationResult> {
  const auth = await requireRole("student");
  if ("error" in auth) return { success: false, error: auth.error };

  try {
    await axios.put(`/api/v1/classroom/assignments/${assignmentId}/submission`, {
      content: input.content,
    });
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

/**
 * `PATCH teaching/submissions/{id}/grade` (SUBMIT-004). `gradedBy`/`gradedAt`
 * are never sent here — the backend's `SubmissionPolicy::grade()` +
 * `GradingService` stamp them itself and validate `score` against the
 * assignment's `totalPoints` server-side. The notification fan-out
 * (`assignment_graded`, best-effort, dispatched after commit) now happens
 * server-side as part of this same call — no separate notify call needed.
 */
export async function gradeSubmission(
  submissionId: string,
  input: GradeSubmissionInput,
): Promise<MutationResult> {
  const auth = await requireRole("teacher");
  if ("error" in auth) return { success: false, error: auth.error };

  try {
    await axios.patch(`/api/v1/teaching/submissions/${submissionId}/grade`, {
      score: input.score,
      feedback: input.feedback || undefined,
    });
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}
