"use server";

/**
 * Client-invokable note mutations, kept in a dedicated file (file-level
 * "use server", every export is an async function — required by Next.js).
 * Client Components import this module directly
 * (`@/actions/lesson-notes.mutations`) instead of the `@/actions` barrel.
 * `src/actions/lesson-notes.ts` re-exports these under `Actions.Notes.*`
 * for SSR use. Same pattern as `subjects.mutations.ts`.
 */

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { MutationResult } from "@/lib/types/common";
import type {
  CreateLessonNoteInput,
  LessonNote,
  UpdateLessonNoteInput,
} from "@/lib/types/lesson-note";
import type { Database } from "@/lib/types/database";

type LessonNoteUpdate = Database["public"]["Tables"]["lesson_notes"]["Update"];

export type CreateNoteResult =
  | { success: true; error: null; note: LessonNote }
  | { success: false; error: string; note: null };

export async function createNote(input: CreateLessonNoteInput): Promise<CreateNoteResult> {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    return { success: false, error: "You must be signed in.", note: null };
  }

  const { data: created, error } = await supabase
    .from("lesson_notes")
    .insert({
      lesson_id: input.lessonId,
      user_id: authData.user.id,
      title: input.title,
      content_markdown: input.contentMarkdown,
    })
    .select("*")
    .single();

  if (error || !created) {
    return { success: false, error: error?.message ?? "Failed to create note.", note: null };
  }

  revalidatePath("/", "layout");
  return {
    success: true,
    error: null,
    note: {
      id: created.id,
      lessonId: created.lesson_id,
      userId: created.user_id,
      title: created.title,
      contentMarkdown: created.content_markdown,
      createdAt: created.created_at,
      updatedAt: created.updated_at,
    },
  };
}

/** Used for both manual saves and debounced autosave from the note editor. */
export async function updateNote(
  id: string,
  input: UpdateLessonNoteInput,
): Promise<MutationResult> {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    return { success: false, error: "You must be signed in." };
  }

  const patch: LessonNoteUpdate = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.contentMarkdown !== undefined) patch.content_markdown = input.contentMarkdown;

  const { error } = await supabase
    .from("lesson_notes")
    .update(patch)
    .eq("id", id)
    .eq("user_id", authData.user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

export async function deleteNote(id: string): Promise<MutationResult> {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    return { success: false, error: "You must be signed in." };
  }

  const { error } = await supabase
    .from("lesson_notes")
    .delete()
    .eq("id", id)
    .eq("user_id", authData.user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}
