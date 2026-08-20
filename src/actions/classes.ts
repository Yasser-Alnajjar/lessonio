import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/common";
import type { Class, ClassMeeting, ClassWithSubject } from "@/lib/types/class";
import type { SubjectIcon } from "@/lib/types/subject";
import type { Database } from "@/lib/types/database";
import {
  createClass,
  deleteClass,
  toggleActiveClass,
  updateClass,
} from "./classes.mutations";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type ClassRow = Database["public"]["Tables"]["classes"]["Row"];

interface SubjectSummary {
  name: string;
  color: string;
  icon: SubjectIcon;
}

function mapClassRow(row: ClassRow): Class {
  return {
    id: row.id,
    userId: row.user_id,
    subjectId: row.subject_id,
    teacher: row.teacher,
    location: row.location,
    // The `classes_meetings_valid` DB constraint guarantees this JSONB
    // column already holds well-formed ClassMeeting objects.
    meetings: row.meetings as unknown as ClassMeeting[],
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function withSubject(
  klass: Class,
  subjectsById: Map<string, SubjectSummary>,
): ClassWithSubject {
  const subject = subjectsById.get(klass.subjectId);
  return {
    ...klass,
    subjectName: subject?.name ?? "Unknown subject",
    subjectColor: subject?.color ?? "#94a3b8",
    subjectIcon: subject?.icon ?? "book-open",
  };
}

/** Fetches the subjects a set of classes belong to in one bulk query — no N+1s. */
async function fetchSubjectsByIds(
  supabase: SupabaseServerClient,
  subjectIds: string[],
): Promise<Map<string, SubjectSummary>> {
  if (subjectIds.length === 0) return new Map();

  const { data: rows } = await supabase
    .from("subjects")
    .select("id, name, color, icon")
    .in("id", subjectIds);

  return new Map(
    (rows ?? []).map((row) => [
      row.id,
      { name: row.name, color: row.color, icon: row.icon as SubjectIcon },
    ]),
  );
}

/**
 * SSR-facing surface for `Actions.Classes.*` — the *recurring* class, the
 * single source of truth for the domain. The dated instances that carry
 * attendance/exam state are `Actions.ClassOccurrences.*`.
 *
 * `getAll`/`getById` are plain SSR-only reads; the mutations are re-exported
 * references to the real Server Actions defined in `classes.mutations.ts`
 * (imported directly by Client Components — see that file's header comment
 * for why).
 */
export const classesActions = {
  async getAll(): Promise<ActionResult<ClassWithSubject[]>> {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return { data: [], error: null };
    }

    const { data: rows, error } = await supabase
      .from("classes")
      .select("*")
      .eq("user_id", authData.user.id)
      .order("created_at", { ascending: true });

    if (error) {
      return { data: null, error: error.message };
    }

    const classes = (rows ?? []).map(mapClassRow);
    if (classes.length === 0) {
      return { data: [], error: null };
    }

    const subjectsById = await fetchSubjectsByIds(
      supabase,
      [...new Set(classes.map((klass) => klass.subjectId))],
    );

    return {
      data: classes.map((klass) => withSubject(klass, subjectsById)),
      error: null,
    };
  },

  async getById(id: string): Promise<ActionResult<ClassWithSubject>> {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return { data: null, error: null };
    }

    const { data: row, error } = await supabase
      .from("classes")
      .select("*")
      .eq("id", id)
      .eq("user_id", authData.user.id)
      .maybeSingle();

    if (error) {
      return { data: null, error: error.message };
    }
    if (!row) {
      return { data: null, error: null };
    }

    const klass = mapClassRow(row);
    const subjectsById = await fetchSubjectsByIds(supabase, [klass.subjectId]);

    return {
      data: withSubject(klass, subjectsById),
      error: null,
    };
  },

  create: createClass,
  update: updateClass,
  toggleActive: toggleActiveClass,
  remove: deleteClass,
};
