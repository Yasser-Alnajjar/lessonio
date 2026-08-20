"use server";

/**
 * Client-invokable flashcard mutations, kept in a dedicated file (file-level
 * "use server", every export is an async function). Client Components import
 * this module directly (`@/actions/flashcards.mutations`) instead of the
 * `@/actions` barrel. `src/actions/flashcards.ts` re-exports these under
 * `Actions.Flashcards.*` for SSR use. Same pattern as `homework.mutations.ts`.
 */

import { revalidatePath } from "next/cache";

import { applySm2, GRADE_TO_QUALITY } from "@/lib/flashcards/sm2";
import { createClient } from "@/lib/supabase/server";
import type { MutationResult } from "@/lib/types/common";
import type {
  CreateFlashcardInput,
  FlashcardGrade,
  UpdateFlashcardInput,
} from "@/lib/types/flashcard";
import type { Database } from "@/lib/types/database";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type FlashcardUpdate = Database["public"]["Tables"]["flashcards"]["Update"];

async function getAuthedUserId(
  supabase: SupabaseServerClient,
): Promise<{ userId: string } | { error: string }> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { error: "You must be signed in." };
  }
  return { userId: data.user.id };
}

/** Looks up the lesson's subject server-side — never trust a client-supplied subject id. */
async function resolveSubjectId(
  supabase: SupabaseServerClient,
  userId: string,
  lessonId: string,
): Promise<{ subjectId: string } | { error: string }> {
  const { data: lesson, error } = await supabase
    .from("lessons")
    .select("subject_id")
    .eq("id", lessonId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!lesson) return { error: "Lesson not found." };
  return { subjectId: lesson.subject_id };
}

export async function createFlashcard(input: CreateFlashcardInput): Promise<MutationResult> {
  const supabase = await createClient();
  const auth = await getAuthedUserId(supabase);
  if ("error" in auth) return { success: false, error: auth.error };

  const subject = await resolveSubjectId(supabase, auth.userId, input.lessonId);
  if ("error" in subject) return { success: false, error: subject.error };

  const { error } = await supabase.from("flashcards").insert({
    user_id: auth.userId,
    lesson_id: input.lessonId,
    subject_id: subject.subjectId,
    front: input.front,
    back: input.back,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

/** Editing content never touches SM-2 state — only `recordReview` advances scheduling. */
export async function updateFlashcard(
  id: string,
  input: UpdateFlashcardInput,
): Promise<MutationResult> {
  const supabase = await createClient();
  const auth = await getAuthedUserId(supabase);
  if ("error" in auth) return { success: false, error: auth.error };

  const patch: FlashcardUpdate = {};
  if (input.front !== undefined) patch.front = input.front;
  if (input.back !== undefined) patch.back = input.back;

  if (Object.keys(patch).length === 0) {
    return { success: true, error: null };
  }

  const { error } = await supabase
    .from("flashcards")
    .update(patch)
    .eq("id", id)
    .eq("user_id", auth.userId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

export async function deleteFlashcard(id: string): Promise<MutationResult> {
  const supabase = await createClient();
  const auth = await getAuthedUserId(supabase);
  if ("error" in auth) return { success: false, error: auth.error };

  const { error } = await supabase
    .from("flashcards")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.userId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

/** Grades one review: advances the card's SM-2 state and logs an immutable `flashcard_reviews` row. */
export async function recordFlashcardReview(
  id: string,
  grade: FlashcardGrade,
): Promise<MutationResult> {
  const supabase = await createClient();
  const auth = await getAuthedUserId(supabase);
  if ("error" in auth) return { success: false, error: auth.error };

  const { data: card, error: fetchError } = await supabase
    .from("flashcards")
    .select("ease_factor, interval_days, repetitions")
    .eq("id", id)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (fetchError) return { success: false, error: fetchError.message };
  if (!card) return { success: false, error: "Flashcard not found." };

  const result = applySm2(
    {
      easeFactor: card.ease_factor,
      intervalDays: card.interval_days,
      repetitions: card.repetitions,
    },
    grade,
  );

  const now = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("flashcards")
    .update({
      ease_factor: result.easeFactor,
      interval_days: result.intervalDays,
      repetitions: result.repetitions,
      due_date: result.dueDate,
      last_reviewed_at: now,
    })
    .eq("id", id)
    .eq("user_id", auth.userId);

  if (updateError) return { success: false, error: updateError.message };

  const { error: reviewError } = await supabase.from("flashcard_reviews").insert({
    user_id: auth.userId,
    flashcard_id: id,
    quality: GRADE_TO_QUALITY[grade],
    reviewed_at: now,
  });

  if (reviewError) return { success: false, error: reviewError.message };

  revalidatePath("/", "layout");
  return { success: true, error: null };
}
