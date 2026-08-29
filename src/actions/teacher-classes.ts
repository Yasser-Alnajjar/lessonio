import "server-only";

import { cache } from "react";

import { axios } from "@/lib/client";
import type { ActionResult } from "@/lib/types/common";
import type { TeacherClassWithStats } from "@/lib/types/teacher-class";
import type { RosterEntry } from "@/lib/types/enrollment";
import {
  createTeacherClass,
  deleteTeacherClass,
  rotateJoinCode,
  toggleArchivedTeacherClass,
  updateTeacherClass,
} from "./teacher-classes.mutations";

/**
 * SSR-facing surface for `Actions.TeacherClasses.*`. `getAll`/`getById`/
 * `getRoster` are plain SSR-only reads; the mutations are re-exported
 * references to the real Server Actions defined in
 * `teacher-classes.mutations.ts` (imported directly by Client Components —
 * see that file's header comment for why).
 */
export const teacherClassesActions = {
  /** `GET teaching/classes` (TCLASS-001) already returns `joinCode`/`studentCount` — no client-side joins needed. */
  async getAll(): Promise<ActionResult<TeacherClassWithStats[]>> {
    try {
      const { data } = await axios.get<{ data: TeacherClassWithStats[] }>(
        "/api/v1/teaching/classes",
      );
      return { data: data.data, error: null };
    } catch {
      return { data: [], error: null };
    }
  },

  getById: cache(
    async (id: string): Promise<ActionResult<TeacherClassWithStats>> => {
      try {
        const { data } = await axios.get<{
          data: TeacherClassWithStats | null;
        }>(`/api/v1/teaching/classes/${id}`);
        return { data: data.data, error: null };
      } catch {
        return { data: null, error: null };
      }
    },
  ),

  /**
   * `GET teaching/classes/{id}/roster` (TCLASS-003) includes `removed`
   * students so the teacher can see who left — unlike the old Supabase read,
   * this is not filtered to `status = 'active'` client-side; the backend
   * decides what the roster shows.
   */
  async getRoster(classId: string): Promise<ActionResult<RosterEntry[]>> {
    try {
      const { data } = await axios.get<{ data: RosterEntry[] }>(
        `/api/v1/teaching/classes/${classId}/roster`,
      );
      return { data: data.data, error: null };
    } catch {
      return { data: [], error: null };
    }
  },

  create: createTeacherClass,
  update: updateTeacherClass,
  toggleArchived: toggleArchivedTeacherClass,
  remove: deleteTeacherClass,
  rotateCode: rotateJoinCode,
};
