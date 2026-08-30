import "server-only";

import { axios } from "@/lib/client";
import type { ActionResult } from "@/lib/types/common";
import type {
  MySubmission,
  SubmissionQueueEntry,
} from "@/lib/types/submission";
import { gradeSubmission, submitAssignment } from "./submissions.mutations";

/**
 * SSR-facing surface for `Actions.Submissions.*`. `getByAssignment`/`getMine`
 * are plain SSR-only reads; the mutations are re-exported references to the
 * real Server Actions defined in `submissions.mutations.ts` (imported
 * directly by Client Components — see that file's header comment for why).
 */
export const submissionsActions = {
  /**
   * The teacher's grading queue for one assignment: `GET
   * teaching/assignments/{id}/submissions` (SUBMIT-001) already returns
   * every actively enrolled student in the assignment's class, left-joined
   * with their submission — non-submitters as `status: "assigned"` rather
   * than omitted. No client-side joins needed.
   */
  async getByAssignment(
    assignmentId: string,
  ): Promise<ActionResult<SubmissionQueueEntry[]>> {
    try {
      const { data } = await axios.get<{ data: SubmissionQueueEntry[] }>(
        `/api/v1/teaching/assignments/${assignmentId}/submissions`,
      );
      return { data: data.data, error: null };
    } catch {
      return { data: [], error: null };
    }
  },

  /**
   * The signed-in student's own submission to one assignment, or `null`
   * before they submit. `GET classroom/assignments/{id}/submission`
   * (SUBMIT-002) already returns the derived `status` field.
   */
  async getMine(
    assignmentId: string,
  ): Promise<ActionResult<MySubmission | null>> {
    try {
      const { data } = await axios.get<{ data: MySubmission | null }>(
        `/api/v1/classroom/assignments/${assignmentId}/submission`,
      );
      return { data: data.data, error: null };
    } catch {
      return { data: null, error: null };
    }
  },

  submit: submitAssignment,
  grade: gradeSubmission,
};
