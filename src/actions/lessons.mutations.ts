"use server";

/**
 * Client-invokable lesson mutations, kept in a dedicated file (file-level
 * "use server", every export is an async function — required by Next.js).
 * Client Components import this module directly (`@/actions/lessons.mutations`)
 * instead of the `@/actions` barrel. `src/actions/lessons.ts` re-exports
 * these under `Actions.Lessons.*` for SSR use. Same pattern as
 * `subjects.mutations.ts`.
 */

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { MutationResult } from "@/lib/types/common";
import type { CreateLessonInput, UpdateLessonInput } from "@/lib/types/lesson";
import type { Database } from "@/lib/types/database";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type LessonUpdate = Database["public"]["Tables"]["lessons"]["Update"];

async function getAuthedUserId(
  supabase: SupabaseServerClient,
): Promise<{ userId: string } | { error: string }> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { error: "You must be signed in." };
  }
  return { userId: data.user.id };
}

/** Replaces every `lesson_tags` row for a lesson with the given tag set. */
async function syncLessonTags(
  supabase: SupabaseServerClient,
  lessonId: string,
  tagIds: string[],
): Promise<string | null> {
  const { error: deleteError } = await supabase
    .from("lesson_tags")
    .delete()
    .eq("lesson_id", lessonId);
  if (deleteError) return deleteError.message;

  if (tagIds.length === 0) return null;

  const { error: insertError } = await supabase
    .from("lesson_tags")
    .insert(tagIds.map((tagId) => ({ lesson_id: lessonId, tag_id: tagId })));
  return insertError?.message ?? null;
}

export async function createLesson(input: CreateLessonInput): Promise<MutationResult> {
  const supabase = await createClient();
  const auth = await getAuthedUserId(supabase);
  if ("error" in auth) return { success: false, error: auth.error };

  const { data: lesson, error } = await supabase
    .from("lessons")
    .insert({
      user_id: auth.userId,
      subject_id: input.subjectId,
      class_occurrence_id: input.classOccurrenceId || null,
      title: input.title,
      date: input.date,
    })
    .select("id")
    .single();

  if (error || !lesson) {
    return { success: false, error: error?.message ?? "Failed to create lesson." };
  }

  if (input.tagIds && input.tagIds.length > 0) {
    const tagError = await syncLessonTags(supabase, lesson.id, input.tagIds);
    if (tagError) return { success: false, error: tagError };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

export async function updateLesson(
  id: string,
  input: UpdateLessonInput,
): Promise<MutationResult> {
  const supabase = await createClient();
  const auth = await getAuthedUserId(supabase);
  if ("error" in auth) return { success: false, error: auth.error };

  const patch: LessonUpdate = {};
  if (input.subjectId !== undefined) patch.subject_id = input.subjectId;
  if (input.classOccurrenceId !== undefined)
    patch.class_occurrence_id = input.classOccurrenceId || null;
  if (input.title !== undefined) patch.title = input.title;
  if (input.date !== undefined) patch.date = input.date;
  if (input.studyStatus !== undefined) patch.study_status = input.studyStatus;
  if (input.reviewStatus !== undefined) patch.review_status = input.reviewStatus;
  if (input.homeworkStatus !== undefined) patch.homework_status = input.homeworkStatus;
  if (input.isArchived !== undefined) patch.is_archived = input.isArchived;

  if (Object.keys(patch).length > 0) {
    const { error } = await supabase
      .from("lessons")
      .update(patch)
      .eq("id", id)
      .eq("user_id", auth.userId);
    if (error) return { success: false, error: error.message };
  }

  if (input.tagIds !== undefined) {
    const tagError = await syncLessonTags(supabase, id, input.tagIds);
    if (tagError) return { success: false, error: tagError };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

/**
 * Copies the scheduling fields and tags onto a brand-new lesson, resetting
 * every status back to its default and clearing archive — notes and
 * attachments belong to the original occurrence and are not copied.
 */
export async function duplicateLesson(id: string): Promise<MutationResult> {
  const supabase = await createClient();
  const auth = await getAuthedUserId(supabase);
  if ("error" in auth) return { success: false, error: auth.error };

  const { data: original, error: fetchError } = await supabase
    .from("lessons")
    .select("*")
    .eq("id", id)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (fetchError) return { success: false, error: fetchError.message };
  if (!original) return { success: false, error: "Lesson not found." };

  const { data: created, error: insertError } = await supabase
    .from("lessons")
    .insert({
      user_id: auth.userId,
      subject_id: original.subject_id,
      class_occurrence_id: original.class_occurrence_id,
      title: `${original.title} (Copy)`,
      date: original.date,
    })
    .select("id")
    .single();

  if (insertError || !created) {
    return { success: false, error: insertError?.message ?? "Failed to duplicate lesson." };
  }

  const { data: tagRows } = await supabase
    .from("lesson_tags")
    .select("tag_id")
    .eq("lesson_id", id);

  if (tagRows && tagRows.length > 0) {
    const tagError = await syncLessonTags(
      supabase,
      created.id,
      tagRows.map((row) => row.tag_id),
    );
    if (tagError) return { success: false, error: tagError };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

/** Flips `is_archived`. Archiving a lesson does not touch its notes or attachments. */
export async function toggleArchiveLesson(id: string): Promise<MutationResult> {
  const supabase = await createClient();
  const auth = await getAuthedUserId(supabase);
  if ("error" in auth) return { success: false, error: auth.error };

  const { data: current, error: fetchError } = await supabase
    .from("lessons")
    .select("is_archived")
    .eq("id", id)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (fetchError) return { success: false, error: fetchError.message };
  if (!current) return { success: false, error: "Lesson not found." };

  const { error } = await supabase
    .from("lessons")
    .update({ is_archived: !current.is_archived })
    .eq("id", id)
    .eq("user_id", auth.userId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

/** Deletes the lesson row. Cascades to its tags, notes, and attachments. */
export async function deleteLesson(id: string): Promise<MutationResult> {
  const supabase = await createClient();
  const auth = await getAuthedUserId(supabase);
  if ("error" in auth) return { success: false, error: auth.error };

  const { error } = await supabase
    .from("lessons")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.userId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/", "layout");
  return { success: true, error: null };
}
