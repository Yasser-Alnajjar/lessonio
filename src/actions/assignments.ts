import "server-only";

import { cache } from "react";

import { axios } from "@/lib/client";
import type { ActionResult } from "@/lib/types/common";
import type {
  AssignmentForStudent,
  AssignmentWithStats,
} from "@/lib/types/assignment";
import {
  createAssignment,
  deleteAssignment,
  publishAssignment,
  unpublishAssignment,
  updateAssignment,
} from "./assignments.mutations";

/**
 * SSR-facing surface for `Actions.Assignments.*`. `getAll`/`getAssignedToMe`/
 * `getById` are plain SSR-only reads; the mutations are re-exported
 * references to the real Server Actions defined in
 * `assignments.mutations.ts` (imported directly by Client Components — see
 * that file's header comment for why).
 */
export const assignmentsActions = {
  /**
   * Teacher's own assignments across every class they teach, any status.
   * `GET teaching/assignments` (ASSIGN-001) already returns `className`
   * joined in — no client-side lookup needed.
   */
  async getAll(): Promise<ActionResult<AssignmentWithStats[]>> {
    try {
      const { data } = await axios.get<{ data: AssignmentWithStats[] }>(
        "/api/v1/teaching/assignments",
      );
      return { data: data.data, error: null };
    } catch {
      return { data: [], error: null };
    }
  },

  /**
   * Published assignments across every class the student is actively
   * enrolled in. `GET classroom/assignments` (ASSIGN-002) already returns
   * `className`/`teacherName` joined in. A student with none gets
   * `{ data: [], error: null }` — a successful result, never an error.
   * Mirrors `Enrollments.getMyClasses()`.
   */
  async getAssignedToMe(): Promise<ActionResult<AssignmentForStudent[]>> {
    try {
      const { data } = await axios.get<{ data: AssignmentForStudent[] }>(
        "/api/v1/classroom/assignments",
      );
      return { data: data.data, error: null };
    } catch {
      return { data: [], error: null };
    }
  },

  /**
   * Single assignment via the shared authenticated route (ASSIGN-003, not
   * under `teaching/*` or `classroom/*`) — visibility is enforced entirely
   * server-side: a teacher sees their own regardless of status, a student
   * only a published one they're actively enrolled in — everyone else gets
   * `{ data: null }`, never a `403` (API_CONTRACT.md §4.3).
   */
  getById: cache(
    async (id: string): Promise<ActionResult<AssignmentForStudent>> => {
      try {
        const { data } = await axios.get<{ data: AssignmentForStudent | null }>(
          `/api/v1/assignments/${id}`,
        );
        return { data: data.data, error: null };
      } catch {
        return { data: null, error: null };
      }
    },
  ),

  create: createAssignment,
  update: updateAssignment,
  publish: publishAssignment,
  unpublish: unpublishAssignment,
  remove: deleteAssignment,
};
