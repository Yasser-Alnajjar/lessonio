import "server-only";

import { auth } from "@auth";
import { axios } from "@/lib/client";
import type { ActionResult } from "@/lib/types/common";
import type { FlashcardDeckSummary, FlashcardWithRelations } from "@/lib/types/flashcard";
import {
  createFlashcard,
  deleteFlashcard,
  recordFlashcardReview,
  updateFlashcard,
} from "./flashcards.mutations";

/** SSR-facing surface for `Actions.Flashcards.*`. Mutations re-export the real Server Actions. */
export const flashcardsActions = {
  /** `GET /api/v1/lessons/{lessonId}/flashcards` (FLASH-001, soft-empty — API_CONTRACT.md §3.5). */
  async getByLesson(lessonId: string): Promise<ActionResult<FlashcardWithRelations[]>> {
    const session = await auth();
    if (!session?.user?.id) return { data: [], error: null };

    try {
      const { data } = await axios.get<{ data: FlashcardWithRelations[] }>(
        `/api/v1/lessons/${lessonId}/flashcards`,
      );
      return { data: data.data, error: null };
    } catch {
      return { data: [], error: null };
    }
  },

  /** Per-subject rollups (total + due-today count) for the deck browser. `GET /api/v1/flashcards/decks` (FLASH-002, soft-empty). */
  async getDecks(): Promise<ActionResult<FlashcardDeckSummary[]>> {
    const session = await auth();
    if (!session?.user?.id) return { data: [], error: null };

    try {
      const { data } = await axios.get<{ data: FlashcardDeckSummary[] }>(
        "/api/v1/flashcards/decks",
      );
      return { data: data.data, error: null };
    } catch {
      return { data: [], error: null };
    }
  },

  /**
   * Cards due today, optionally scoped to one subject or lesson. Backs the
   * review runner. `GET /api/v1/flashcards/due` (FLASH-003, soft-empty) —
   * the backend applies the same "lessonId wins over subjectId" precedence
   * and the 100-card queue cap that the Supabase query used to.
   */
  async getDueQueue(params?: {
    subjectId?: string;
    lessonId?: string;
  }): Promise<ActionResult<FlashcardWithRelations[]>> {
    const session = await auth();
    if (!session?.user?.id) return { data: [], error: null };

    try {
      const { data } = await axios.get<{ data: FlashcardWithRelations[] }>(
        "/api/v1/flashcards/due",
        { params: { subjectId: params?.subjectId, lessonId: params?.lessonId } },
      );
      return { data: data.data, error: null };
    } catch {
      return { data: [], error: null };
    }
  },

  create: createFlashcard,
  update: updateFlashcard,
  remove: deleteFlashcard,
  recordReview: recordFlashcardReview,
};
