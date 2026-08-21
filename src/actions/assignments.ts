import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/common";
import type {
  Assignment,
  AssignmentForStudent,
  AssignmentWithStats,
} from "@/lib/types/assignment";
import type { Database } from "@/lib/types/database";
import {
  createAssignment,
  deleteAssignment,
  publishAssignment,
  unpublishAssignment,
  updateAssignment,
} from "./assignments.mutations";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type AssignmentRow = Database["public"]["Tables"]["assignments"]["Row"];

function mapAssignmentRow(row: AssignmentRow): Assignment {
  return {
    id: row.id,
    teacherClassId: row.teacher_class_id,
    teacherId: row.teacher_id,
    title: row.title,
    instructions: row.instructions,
    dueAt: row.due_at,
    totalPoints: row.total_points,
    status: row.status as Assignment["status"],
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Bulk-fetches class names for a set of classes in one query — no N+1. */
async function fetchClassNamesByIds(
  supabase: SupabaseServerClient,
  classIds: string[],
): Promise<Map<string, string>> {
  if (classIds.length === 0) return new Map();

  const { data: rows } = await supabase
    .from("teacher_classes")
    .select("id, name")
    .in("id", classIds);

  return new Map((rows ?? []).map((row) => [row.id, row.name]));
}

/**
 * Bulk-joins classes + their teachers' display names for a set of class ids
 * in two queries — no N+1. Used by the student-facing reads below, where
 * each assignment needs both its class name and its teacher's name.
 */
async function fetchClassesWithTeacherNames(
  supabase: SupabaseServerClient,
  classIds: string[],
): Promise<Map<string, { name: string; teacherName: string | null }>> {
  if (classIds.length === 0) return new Map();

  const { data: classes } = await supabase
    .from("teacher_classes")
    .select("id, name, teacher_id")
    .in("id", classIds);

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

  return new Map(
    (classes ?? []).map((klass) => [
      klass.id,
      {
        name: klass.name,
        teacherName: teacherNamesById.get(klass.teacher_id) ?? null,
      },
    ]),
  );
}

function toAssignmentForStudent(
  assignment: Assignment,
  classesById: Map<string, { name: string; teacherName: string | null }>,
): AssignmentForStudent {
  const klass = classesById.get(assignment.teacherClassId);
  return {
    id: assignment.id,
    teacherClassId: assignment.teacherClassId,
    title: assignment.title,
    instructions: assignment.instructions,
    dueAt: assignment.dueAt,
    totalPoints: assignment.totalPoints,
    status: assignment.status,
    publishedAt: assignment.publishedAt,
    className: klass?.name ?? "Unknown class",
    teacherName: klass?.teacherName ?? null,
  };
}

/**
 * SSR-facing surface for `Actions.Assignments.*`. `getAll`/`getAssignedToMe`/
 * `getById` are plain SSR-only reads; the mutations are re-exported
 * references to the real Server Actions defined in
 * `assignments.mutations.ts` (imported directly by Client Components — see
 * that file's header comment for why).
 */
export const assignmentsActions = {
  /** Teacher's own assignments across every class they teach, any status. */
  async getAll(): Promise<ActionResult<AssignmentWithStats[]>> {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return { data: [], error: null };
    }

    const { data: rows, error } = await supabase
      .from("assignments")
      .select("*")
      .eq("teacher_id", authData.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }

    const assignments = (rows ?? []).map(mapAssignmentRow);
    if (assignments.length === 0) {
      return { data: [], error: null };
    }

    const classIds = [
      ...new Set(assignments.map((assignment) => assignment.teacherClassId)),
    ];
    const classNamesById = await fetchClassNamesByIds(supabase, classIds);

    return {
      data: assignments.map((assignment) => ({
        ...assignment,
        className: classNamesById.get(assignment.teacherClassId) ?? "",
      })),
      error: null,
    };
  },

  /**
   * Published assignments across every class the student is actively
   * enrolled in. A student with none gets `{ data: [], error: null }` — a
   * successful result, never an error. Mirrors `Enrollments.getMyClasses()`.
   */
  async getAssignedToMe(): Promise<ActionResult<AssignmentForStudent[]>> {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return { data: [], error: null };
    }

    const { data: enrollments, error: enrollError } = await supabase
      .from("class_enrollments")
      .select("teacher_class_id")
      .eq("student_id", authData.user.id)
      .eq("status", "active");

    if (enrollError) {
      return { data: null, error: enrollError.message };
    }

    const classIds = [
      ...new Set((enrollments ?? []).map((row) => row.teacher_class_id)),
    ];
    if (classIds.length === 0) {
      return { data: [], error: null };
    }

    const { data: rows, error } = await supabase
      .from("assignments")
      .select("*")
      .in("teacher_class_id", classIds)
      .eq("status", "published")
      .order("due_at", { ascending: true });

    if (error) {
      return { data: null, error: error.message };
    }

    const assignments = (rows ?? []).map(mapAssignmentRow);
    if (assignments.length === 0) {
      return { data: [], error: null };
    }

    const assignedClassIds = [
      ...new Set(assignments.map((assignment) => assignment.teacherClassId)),
    ];
    const classesById = await fetchClassesWithTeacherNames(
      supabase,
      assignedClassIds,
    );

    return {
      data: assignments.map((assignment) =>
        toAssignmentForStudent(assignment, classesById),
      ),
      error: null,
    };
  },

  /**
   * Single assignment. Visibility is enforced entirely by RLS: a teacher
   * sees their own regardless of status, a student only a published one
   * they're actively enrolled in — everyone else gets `{ data: null }`.
   */
  async getById(id: string): Promise<ActionResult<AssignmentForStudent>> {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return { data: null, error: null };
    }

    const { data: row, error } = await supabase
      .from("assignments")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return { data: null, error: error.message };
    }
    if (!row) {
      return { data: null, error: null };
    }

    const assignment = mapAssignmentRow(row);
    const classesById = await fetchClassesWithTeacherNames(supabase, [
      assignment.teacherClassId,
    ]);

    return {
      data: toAssignmentForStudent(assignment, classesById),
      error: null,
    };
  },

  create: createAssignment,
  update: updateAssignment,
  publish: publishAssignment,
  unpublish: unpublishAssignment,
  remove: deleteAssignment,
};
