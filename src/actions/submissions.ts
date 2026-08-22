import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/common";
import type {
  AssignmentSubmission,
  MySubmission,
  SubmissionQueueEntry,
  SubmissionStatus,
} from "@/lib/types/submission";
import type { Database } from "@/lib/types/database";
import { gradeSubmission, submitAssignment } from "./submissions.mutations";

type SubmissionRow =
  Database["public"]["Tables"]["assignment_submissions"]["Row"];

function mapSubmissionRow(row: SubmissionRow): AssignmentSubmission {
  return {
    id: row.id,
    assignmentId: row.assignment_id,
    studentId: row.student_id,
    content: row.content,
    submittedAt: row.submitted_at,
    score: row.score,
    feedback: row.feedback,
    gradedAt: row.graded_at,
    gradedBy: row.graded_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Derived, not stored — a null submission is "assigned", never an error. */
function statusOf(submission: AssignmentSubmission | null): SubmissionStatus {
  if (!submission) return "assigned";
  return submission.gradedAt ? "graded" : "submitted";
}

/**
 * SSR-facing surface for `Actions.Submissions.*`. `getByAssignment`/`getMine`
 * are plain SSR-only reads; the mutations are re-exported references to the
 * real Server Actions defined in `submissions.mutations.ts` (imported
 * directly by Client Components — see that file's header comment for why).
 */
export const submissionsActions = {
  /**
   * The teacher's grading queue for one assignment: every actively enrolled
   * student in the assignment's class, left-joined with their submission.
   * Non-submitters appear as `status: "assigned"` rather than being
   * omitted — a grading queue must show who hasn't turned work in.
   */
  async getByAssignment(
    assignmentId: string,
  ): Promise<ActionResult<SubmissionQueueEntry[]>> {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return { data: [], error: null };
    }

    const { data: assignment, error: assignmentError } = await supabase
      .from("assignments")
      .select("id, teacher_class_id")
      .eq("id", assignmentId)
      .maybeSingle();

    if (assignmentError) {
      return { data: null, error: assignmentError.message };
    }
    if (!assignment) {
      return { data: [], error: null };
    }

    const { data: enrollments, error: enrollError } = await supabase
      .from("class_enrollments")
      .select("student_id")
      .eq("teacher_class_id", assignment.teacher_class_id)
      .eq("status", "active");

    if (enrollError) {
      return { data: null, error: enrollError.message };
    }
    if (!enrollments || enrollments.length === 0) {
      return { data: [], error: null };
    }

    const studentIds = enrollments.map((row) => row.student_id);

    const [
      { data: profiles },
      { data: submissionRows, error: submissionsError },
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", studentIds),
      supabase
        .from("assignment_submissions")
        .select("*")
        .eq("assignment_id", assignmentId),
    ]);

    if (submissionsError) {
      return { data: null, error: submissionsError.message };
    }

    const profilesById = new Map((profiles ?? []).map((row) => [row.id, row]));
    const submissionsByStudentId = new Map(
      (submissionRows ?? []).map((row) => [
        row.student_id,
        mapSubmissionRow(row),
      ]),
    );

    return {
      data: studentIds.map((studentId) => {
        const submission = submissionsByStudentId.get(studentId) ?? null;
        return {
          studentId,
          fullName: profilesById.get(studentId)?.full_name ?? null,
          avatarUrl: profilesById.get(studentId)?.avatar_url ?? null,
          status: statusOf(submission),
          submission,
        };
      }),
      error: null,
    };
  },

  /** The signed-in student's own submission to one assignment, or `null` before they submit. */
  async getMine(
    assignmentId: string,
  ): Promise<ActionResult<MySubmission | null>> {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return { data: null, error: null };
    }

    const { data: row, error } = await supabase
      .from("assignment_submissions")
      .select("*")
      .eq("assignment_id", assignmentId)
      .eq("student_id", authData.user.id)
      .maybeSingle();

    if (error) {
      return { data: null, error: error.message };
    }
    if (!row) {
      return { data: null, error: null };
    }

    const submission = mapSubmissionRow(row);
    return {
      data: { ...submission, status: statusOf(submission) },
      error: null,
    };
  },

  submit: submitAssignment,
  grade: gradeSubmission,
};
