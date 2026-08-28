import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/common";
import type {
  Lesson,
  LessonFilters,
  LessonWithRelations,
} from "@/lib/types/lesson";
import type { Database } from "@/lib/types/database";
import {
  createLesson,
  deleteLesson,
  duplicateLesson,
  toggleArchiveLesson,
  updateLesson,
} from "./lessons.mutations";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type LessonRow = Database["public"]["Tables"]["lessons"]["Row"];

function countByKey(rows: Array<{ lesson_id: string }>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.lesson_id, (counts.get(row.lesson_id) ?? 0) + 1);
  }
  return counts;
}

function mapLessonRow(
  row: LessonRow,
  subjects: Map<string, { name: string; color: string }>,
  tagsByLesson: Map<string, string[]>,
  noteCounts: Map<string, number>,
  attachmentCounts: Map<string, number>,
): LessonWithRelations {
  const subject = subjects.get(row.subject_id);

  const lesson: Lesson = {
    id: row.id,
    userId: row.user_id,
    subjectId: row.subject_id,
    classOccurrenceId: row.class_occurrence_id,
    title: row.title,
    date: row.date,
    studyStatus: row.study_status as Lesson["studyStatus"],
    reviewStatus: row.review_status as Lesson["reviewStatus"],
    homeworkStatus: row.homework_status as Lesson["homeworkStatus"],
    isArchived: row.is_archived,
    tagIds: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  return {
    ...lesson,
    subjectName: subject?.name ?? "Unknown subject",
    subjectColor: subject?.color ?? "#94a3b8",
    tags: tagsByLesson.get(row.id) ?? [],
    noteCount: noteCounts.get(row.id) ?? 0,
    attachmentCount: attachmentCounts.get(row.id) ?? 0,
  };
}

/** Fetches every relation a lesson list needs in a handful of bulk queries — no N+1s. */
async function attachRelations(
  supabase: SupabaseServerClient,
  rows: LessonRow[],
): Promise<LessonWithRelations[]> {
  if (rows.length === 0) return [];

  const subjectIds = [...new Set(rows.map((row) => row.subject_id))];
  const lessonIds = rows.map((row) => row.id);

  const [
    { data: subjectRows },
    { data: lessonTagRows },
    { data: noteRows },
    { data: attachmentRows },
  ] = await Promise.all([
    supabase.from("subjects").select("id, name, color").in("id", subjectIds),
    supabase
      .from("lesson_tags")
      .select("lesson_id, tag_id")
      .in("lesson_id", lessonIds),
    supabase
      .from("lesson_notes")
      .select("lesson_id")
      .in("lesson_id", lessonIds),
    supabase.from("attachments").select("lesson_id").in("lesson_id", lessonIds),
  ]);

  const subjects = new Map(
    (subjectRows ?? []).map((row) => [
      row.id,
      { name: row.name, color: row.color },
    ]),
  );

  const tagIds = [...new Set((lessonTagRows ?? []).map((row) => row.tag_id))];
  const { data: tagRows } =
    tagIds.length > 0
      ? await supabase.from("tags").select("id, name").in("id", tagIds)
      : { data: [] as Array<{ id: string; name: string }> };
  const tagNamesById = new Map(
    (tagRows ?? []).map((row) => [row.id, row.name]),
  );

  const tagsByLesson = new Map<string, string[]>();
  for (const link of lessonTagRows ?? []) {
    const tagName = tagNamesById.get(link.tag_id);
    if (!tagName) continue;
    const existing = tagsByLesson.get(link.lesson_id) ?? [];
    existing.push(tagName);
    tagsByLesson.set(link.lesson_id, existing);
  }

  const noteCounts = countByKey(noteRows ?? []);
  const attachmentCounts = countByKey(attachmentRows ?? []);

  return rows.map((row) =>
    mapLessonRow(row, subjects, tagsByLesson, noteCounts, attachmentCounts),
  );
}

async function fetchTagIdsByLesson(
  supabase: SupabaseServerClient,
  lessonIds: string[],
): Promise<Map<string, string[]>> {
  if (lessonIds.length === 0) return new Map();

  const { data: rows } = await supabase
    .from("lesson_tags")
    .select("lesson_id, tag_id")
    .in("lesson_id", lessonIds);

  const byLesson = new Map<string, string[]>();
  for (const row of rows ?? []) {
    const existing = byLesson.get(row.lesson_id) ?? [];
    existing.push(row.tag_id);
    byLesson.set(row.lesson_id, existing);
  }
  return byLesson;
}

/** SSR-facing surface for `Actions.Lessons.*`. Mutations re-export the real Server Actions. */
export const lessonsActions = {
  async getAll(
    filters?: LessonFilters,
  ): Promise<ActionResult<LessonWithRelations[]>> {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return { data: [], error: null };
    }

    let query = supabase
      .from("lessons")
      .select("*")
      .eq("user_id", authData.user.id);

    if (filters?.subjectId) query = query.eq("subject_id", filters.subjectId);
    if (filters?.studyStatus)
      query = query.eq("study_status", filters.studyStatus);
    if (filters?.reviewStatus)
      query = query.eq("review_status", filters.reviewStatus);
    if (filters?.dateFrom) query = query.gte("date", filters.dateFrom);
    if (filters?.dateTo) query = query.lte("date", filters.dateTo);

    const { data: lessonRows, error } = await query.order("date", {
      ascending: false,
    });

    if (error) {
      return { data: null, error: error.message };
    }

    let rows = lessonRows ?? [];

    if (filters?.tagIds && filters.tagIds.length > 0) {
      const tagIdsByLesson = await fetchTagIdsByLesson(
        supabase,
        rows.map((row) => row.id),
      );
      rows = rows.filter((row) =>
        filters.tagIds!.some((tagId) =>
          tagIdsByLesson.get(row.id)?.includes(tagId),
        ),
      );
    }

    const lessons = await attachRelations(supabase, rows);
    return { data: lessons, error: null };
  },

  getById: cache(
    async (id: string): Promise<ActionResult<LessonWithRelations>> => {
      const supabase = await createClient();
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        return { data: null, error: null };
      }

      const { data: row, error } = await supabase
        .from("lessons")
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

      const [withRelations] = await attachRelations(supabase, [row]);
      const tagIdsByLesson = await fetchTagIdsByLesson(supabase, [row.id]);

      return {
        data: { ...withRelations!, tagIds: tagIdsByLesson.get(row.id) ?? [] },
        error: null,
      };
    },
  ),

  create: createLesson,
  update: updateLesson,
  duplicate: duplicateLesson,
  archive: toggleArchiveLesson,
  remove: deleteLesson,
};
