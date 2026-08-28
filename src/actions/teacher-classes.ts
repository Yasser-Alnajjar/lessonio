import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/common";
import type {
  TeacherClass,
  TeacherClassWithStats,
} from "@/lib/types/teacher-class";
import type { RosterEntry } from "@/lib/types/enrollment";
import type { Database } from "@/lib/types/database";
import {
  createTeacherClass,
  deleteTeacherClass,
  rotateJoinCode,
  toggleArchivedTeacherClass,
  updateTeacherClass,
} from "./teacher-classes.mutations";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type TeacherClassRow = Database["public"]["Tables"]["teacher_classes"]["Row"];

function mapTeacherClassRow(row: TeacherClassRow): TeacherClass {
  return {
    id: row.id,
    teacherId: row.teacher_id,
    name: row.name,
    subjectLabel: row.subject_label,
    description: row.description,
    isArchived: row.is_archived,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Bulk-fetches join codes for a set of classes in one query — no N+1. */
async function fetchJoinCodesByClassIds(
  supabase: SupabaseServerClient,
  classIds: string[],
): Promise<Map<string, string>> {
  if (classIds.length === 0) return new Map();

  const { data: rows } = await supabase
    .from("class_join_codes")
    .select("teacher_class_id, code")
    .in("teacher_class_id", classIds);

  return new Map((rows ?? []).map((row) => [row.teacher_class_id, row.code]));
}

/** Bulk-counts active students per class in one query — no N+1. */
async function fetchStudentCountsByClassIds(
  supabase: SupabaseServerClient,
  classIds: string[],
): Promise<Map<string, number>> {
  if (classIds.length === 0) return new Map();

  const { data: rows } = await supabase
    .from("class_enrollments")
    .select("teacher_class_id")
    .eq("status", "active")
    .in("teacher_class_id", classIds);

  const counts = new Map<string, number>();
  for (const row of rows ?? []) {
    counts.set(
      row.teacher_class_id,
      (counts.get(row.teacher_class_id) ?? 0) + 1,
    );
  }
  return counts;
}

function withStats(
  _class: TeacherClass,
  joinCodesById: Map<string, string>,
  studentCountsById: Map<string, number>,
): TeacherClassWithStats {
  return {
    ..._class,
    joinCode: joinCodesById.get(_class.id) ?? "",
    studentCount: studentCountsById.get(_class.id) ?? 0,
  };
}

/**
 * SSR-facing surface for `Actions.TeacherClasses.*`. `getAll`/`getById`/
 * `getRoster` are plain SSR-only reads; the mutations are re-exported
 * references to the real Server Actions defined in
 * `teacher-classes.mutations.ts` (imported directly by Client Components —
 * see that file's header comment for why).
 */
export const teacherClassesActions = {
  async getAll(): Promise<ActionResult<TeacherClassWithStats[]>> {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return { data: [], error: null };
    }

    const { data: rows, error } = await supabase
      .from("teacher_classes")
      .select("*")
      .eq("teacher_id", authData.user.id)
      .order("created_at", { ascending: true });

    if (error) {
      return { data: null, error: error.message };
    }

    const classes = (rows ?? []).map(mapTeacherClassRow);
    if (classes.length === 0) {
      return { data: [], error: null };
    }

    const classIds = classes.map((_class) => _class.id);
    const [joinCodesById, studentCountsById] = await Promise.all([
      fetchJoinCodesByClassIds(supabase, classIds),
      fetchStudentCountsByClassIds(supabase, classIds),
    ]);

    return {
      data: classes.map((_class) =>
        withStats(_class, joinCodesById, studentCountsById),
      ),
      error: null,
    };
  },

  getById: cache(
    async (id: string): Promise<ActionResult<TeacherClassWithStats>> => {
      const supabase = await createClient();
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        return { data: null, error: null };
      }

      const { data: row, error } = await supabase
        .from("teacher_classes")
        .select("*")
        .eq("id", id)
        .eq("teacher_id", authData.user.id)
        .maybeSingle();

      if (error) {
        return { data: null, error: error.message };
      }
      if (!row) {
        return { data: null, error: null };
      }

      const _class = mapTeacherClassRow(row);
      const [joinCodesById, studentCountsById] = await Promise.all([
        fetchJoinCodesByClassIds(supabase, [_class.id]),
        fetchStudentCountsByClassIds(supabase, [_class.id]),
      ]);

      return {
        data: withStats(_class, joinCodesById, studentCountsById),
        error: null,
      };
    },
  ),

  /**
   * Only `status = 'active'` enrollments — a roster is "who's in the class
   * now", not a change log. Restoring a removed student isn't part of this
   * phase's UI.
   */
  async getRoster(classId: string): Promise<ActionResult<RosterEntry[]>> {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return { data: [], error: null };
    }

    const { data: enrollments, error } = await supabase
      .from("class_enrollments")
      .select("student_id, status, joined_at")
      .eq("teacher_class_id", classId)
      .eq("status", "active")
      .order("joined_at", { ascending: true });

    if (error) {
      return { data: null, error: error.message };
    }
    if (!enrollments || enrollments.length === 0) {
      return { data: [], error: null };
    }

    const studentIds = enrollments.map((row) => row.student_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", studentIds);

    const profilesById = new Map(
      (profiles ?? []).map((profile) => [profile.id, profile]),
    );

    return {
      data: enrollments.map((row) => ({
        studentId: row.student_id,
        fullName: profilesById.get(row.student_id)?.full_name ?? null,
        avatarUrl: profilesById.get(row.student_id)?.avatar_url ?? null,
        status: row.status as "active" | "removed",
        joinedAt: row.joined_at,
      })),
      error: null,
    };
  },

  create: createTeacherClass,
  update: updateTeacherClass,
  toggleArchived: toggleArchivedTeacherClass,
  remove: deleteTeacherClass,
  rotateCode: rotateJoinCode,
};
