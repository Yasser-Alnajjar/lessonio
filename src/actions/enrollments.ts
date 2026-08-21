import "server-only";

import { createClient } from "@/lib/supabase/server";
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
   * A student with zero enrollments gets `{ data: [], error: null }` — a
   * successful result, never an error. This is the default, most common
   * student, not an exception. See the plan's "Core constraint" section.
   */
  async getMyClasses(): Promise<ActionResult<EnrolledClass[]>> {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return { data: [], error: null };
    }

    const { data: enrollments, error } = await supabase
      .from("class_enrollments")
      .select("teacher_class_id, status, joined_at")
      .eq("student_id", authData.user.id)
      .eq("status", "active")
      .order("joined_at", { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }
    if (!enrollments || enrollments.length === 0) {
      return { data: [], error: null };
    }

    const classIds = enrollments.map((row) => row.teacher_class_id);
    const { data: classes } = await supabase
      .from("teacher_classes")
      .select("id, name, subject_label, teacher_id")
      .in("id", classIds);

    const classesById = new Map(
      (classes ?? []).map((klass) => [klass.id, klass]),
    );

    const teacherIds = [
      ...new Set((classes ?? []).map((klass) => klass.teacher_id)),
    ];
    const { data: teacherProfiles } = teacherIds.length
      ? await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", teacherIds)
      : { data: [] };

    const teacherNamesById = new Map(
      (teacherProfiles ?? []).map((profile) => [profile.id, profile.full_name]),
    );

    return {
      data: enrollments.map((row) => {
        const klass = classesById.get(row.teacher_class_id);
        return {
          teacherClassId: row.teacher_class_id,
          name: klass?.name ?? "Unknown class",
          subjectLabel: klass?.subject_label ?? null,
          teacherName: klass
            ? (teacherNamesById.get(klass.teacher_id) ?? null)
            : null,
          status: row.status as "active" | "removed",
          joinedAt: row.joined_at,
        };
      }),
      error: null,
    };
  },

  join: joinClass,
  leave: leaveClass,
  removeStudent,
};
