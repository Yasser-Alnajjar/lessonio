import "server-only";

import { axios } from "@/lib/client";
import type { ActionResult } from "@/lib/types/common";
import type { EnrolledClass } from "@/lib/types/enrollment";
import { joinClass, leaveClass, removeStudent } from "./enrollments.mutations";

/**
 * SSR-facing surface for `Actions.Enrollments.*`. `getMyClasses` is a plain
 * SSR-only read for the *student* side; the mutations are re-exported
 * references to the real Server Actions defined in `enrollments.mutations.ts`
 * (imported directly by Client Components — see that file's header comment
 * for why).
 */
export const enrollmentsActions = {
  /**
   * `GET classroom/classes` (ENROLL-001) already returns the joined
   * `name`/`subjectLabel`/`teacherName` shape — no client-side joins needed.
   * A student with zero enrollments gets `{ data: [], error: null }` — a
   * successful result, never an error. This is the default, most common
   * student, not an exception. See the plan's "Core constraint" section.
   */
  async getMyClasses(): Promise<ActionResult<EnrolledClass[]>> {
    try {
      const { data } = await axios.get<{ data: EnrolledClass[] }>(
        "/api/v1/classroom/classes",
      );
      return { data: data.data, error: null };
    } catch {
      return { data: [], error: null };
    }
  },

  join: joinClass,
  leave: leaveClass,
  removeStudent,
};
