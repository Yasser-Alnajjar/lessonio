"use server";

/**
 * Client-invokable flashcard mutations, kept in a dedicated file (file-level
 * "use server", every export is an async function). Client Components import
 * this module directly (`@/actions/flashcards.mutations`) instead of the
 * `@/actions` barrel. `src/actions/flashcards.ts` re-exports these under
 * `Actions.Flashcards.*` for SSR use. Same pattern as `homework.mutations.ts`.
 */

import { revalidatePath } from "next/cache";

import { auth } from "@auth";
import { axios } from "@/lib/client";
import { getApiErrorMessage } from "@/lib/client/errors";
import type { MutationResult } from "@/lib/types/common";
import type {
  CreateFlashcardInput,
  FlashcardGrade,
  UpdateFlashcardInput,
} from "@/lib/types/flashcard";

export async function createFlashcard(input: CreateFlashcardInput): Promise<MutationResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "You must be signed in." };

  try {
    // subjectId is derived server-side from the lesson (FLASH-004) — never sent by the client.
    await axios.post("/api/v1/flashcards", {
      lessonId: input.lessonId,
      front: input.front,
      back: input.back,
    });
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

/** Editing content never touches SM-2 state — only `recordReview` advances scheduling. */
export async function updateFlashcard(
  id: string,
  input: UpdateFlashcardInput,
): Promise<MutationResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "You must be signed in." };

  const patch: Record<string, unknown> = {};
  if (input.front !== undefined) patch.front = input.front;
  if (input.back !== undefined) patch.back = input.back;

  if (Object.keys(patch).length === 0) {
    return { success: true, error: null };
  }

  try {
    // FLASH-005 — sparse front/back only; SM-2 state is never client-editable.
    await axios.patch(`/api/v1/flashcards/${id}`, patch);
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

export async function deleteFlashcard(id: string): Promise<MutationResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "You must be signed in." };

  try {
    await axios.delete(`/api/v1/flashcards/${id}`);
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

/**
 * Grades one review. `POST /api/v1/flashcards/{id}/reviews` (FLASH-007) now
 * owns the SM-2 scheduling math and the `flashcard_reviews` insert
 * server-side (`FlashcardService::recordReview`, ported line-for-line from
 * `src/lib/flashcards/sm2.ts`'s `applySm2`, in one DB transaction) — this is
 * a thin POST of the grade rather than a fetch-compute-update. See the
 * migration report for what that leaves of `sm2.ts` on the client.
 */
export async function recordFlashcardReview(
  id: string,
  grade: FlashcardGrade,
): Promise<MutationResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "You must be signed in." };

  try {
    await axios.post(`/api/v1/flashcards/${id}/reviews`, { grade });
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}
