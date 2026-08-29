"use server";

/**
 * Client-invokable exam mutations, kept in a dedicated file (file-level
 * "use server", every export is an async function). Client Components import
 * this module directly (`@/actions/exams.mutations`) instead of the
 * `@/actions` barrel. `src/actions/exams.ts` re-exports these under
 * `Actions.Exams.*` for SSR use. Same pattern as `lessons.mutations.ts`.
 */

import { revalidatePath } from "next/cache";

import { auth } from "@auth";
import { axios } from "@/lib/client";
import { getApiErrorMessage } from "@/lib/client/errors";
import type { MutationResult } from "@/lib/types/common";
import type { CreateExamInput, UpdateExamInput } from "@/lib/types/exam";

export async function createExam(input: CreateExamInput): Promise<MutationResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "You must be signed in." };

  try {
    // subjectId is derived server-side from the lesson (EXAM-002) — never sent by the client.
    await axios.post("/api/v1/exams", {
      lessonId: input.lessonId,
      title: input.title,
      date: input.date,
      totalScore: input.totalScore,
      score: input.score ?? null,
    });
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

export async function updateExam(id: string, input: UpdateExamInput): Promise<MutationResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "You must be signed in." };

  const patch: Record<string, unknown> = {};
  if (input.lessonId !== undefined) patch.lessonId = input.lessonId;
  if (input.title !== undefined) patch.title = input.title;
  if (input.date !== undefined) patch.date = input.date;
  if (input.totalScore !== undefined) patch.totalScore = input.totalScore;
  if (input.score !== undefined) patch.score = input.score;

  if (Object.keys(patch).length === 0) {
    return { success: true, error: null };
  }

  try {
    // EXAM-003 — sparse PATCH; changing lessonId re-derives subjectId server-side.
    await axios.patch(`/api/v1/exams/${id}`, patch);
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

/**
 * Dedicated `PATCH /api/v1/exams/{id}/score` (EXAM-004) — a distinct
 * endpoint from the general update, backing the exams list's inline
 * "record score" control. Mirrors the Supabase code's own split between a
 * full-row update and a score-only update.
 */
export async function updateExamScore(id: string, score: number): Promise<MutationResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "You must be signed in." };

  try {
    await axios.patch(`/api/v1/exams/${id}/score`, { score });
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}

export async function deleteExam(id: string): Promise<MutationResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "You must be signed in." };

  try {
    await axios.delete(`/api/v1/exams/${id}`);
  } catch (error) {
    return { success: false, error: getApiErrorMessage(error) };
  }

  revalidatePath("/", "layout");
  return { success: true, error: null };
}
