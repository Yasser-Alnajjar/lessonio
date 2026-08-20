import "server-only";

import { format } from "date-fns";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/common";
import type { Database } from "@/lib/types/database";
import type { Flashcard, FlashcardDeckSummary, FlashcardWithRelations } from "@/lib/types/flashcard";
import {
  createFlashcard,
  deleteFlashcard,
  recordFlashcardReview,
  updateFlashcard,
} from "./flashcards.mutations";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type FlashcardRow = Database["public"]["Tables"]["flashcards"]["Row"];

/** Cap on a single review session — keeps the runner from loading an unbounded backlog at once. */
const REVIEW_QUEUE_LIMIT = 100;

function mapFlashcardRow(
  row: FlashcardRow,
  subjects: Map<string, { name: string; color: string }>,
  lessonTitles: Map<string, string>,
): FlashcardWithRelations {
  const subject = subjects.get(row.subject_id);

  const card: Flashcard = {
    id: row.id,
    userId: row.user_id,
    lessonId: row.lesson_id,
    subjectId: row.subject_id,
    front: row.front,
    back: row.back,
    easeFactor: row.ease_factor,
    intervalDays: row.interval_days,
    repetitions: row.repetitions,
    dueDate: row.due_date,
    lastReviewedAt: row.last_reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  return {
    ...card,
    subjectName: subject?.name ?? "Unknown subject",
    subjectColor: subject?.color ?? "#94a3b8",
    lessonTitle: lessonTitles.get(row.lesson_id) ?? "Unknown lesson",
  };
}

/** Bulk-fetches subject and lesson relations — no N+1s. Mirrors `attachRelations` in homework.ts. */
async function attachRelations(
  supabase: SupabaseServerClient,
  rows: FlashcardRow[],
): Promise<FlashcardWithRelations[]> {
  if (rows.length === 0) return [];

  const subjectIds = [...new Set(rows.map((row) => row.subject_id))];
  const lessonIds = [...new Set(rows.map((row) => row.lesson_id))];

  const [{ data: subjectRows }, { data: lessonRows }] = await Promise.all([
    supabase.from("subjects").select("id, name, color").in("id", subjectIds),
    supabase.from("lessons").select("id, title").in("id", lessonIds),
  ]);

  const subjects = new Map(
    (subjectRows ?? []).map((row) => [row.id, { name: row.name, color: row.color }]),
  );
  const lessonTitles = new Map((lessonRows ?? []).map((row) => [row.id, row.title]));

  return rows.map((row) => mapFlashcardRow(row, subjects, lessonTitles));
}

/** SSR-facing surface for `Actions.Flashcards.*`. Mutations re-export the real Server Actions. */
export const flashcardsActions = {
  async getByLesson(lessonId: string): Promise<ActionResult<FlashcardWithRelations[]>> {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return { data: [], error: null };
    }

    const { data: rows, error } = await supabase
      .from("flashcards")
      .select("*")
      .eq("user_id", authData.user.id)
      .eq("lesson_id", lessonId)
      .order("created_at", { ascending: true });

    if (error) {
      return { data: null, error: error.message };
    }

    const cards = await attachRelations(supabase, rows ?? []);
    return { data: cards, error: null };
  },

  /** Per-subject rollups (total + due-today count) for the deck browser. */
  async getDecks(): Promise<ActionResult<FlashcardDeckSummary[]>> {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return { data: [], error: null };
    }

    const todayIso = format(new Date(), "yyyy-MM-dd");

    const [{ data: cardRows, error }, { data: subjectRows }] = await Promise.all([
      supabase
        .from("flashcards")
        .select("subject_id, due_date")
        .eq("user_id", authData.user.id),
      supabase
        .from("subjects")
        .select("id, name, color")
        .eq("user_id", authData.user.id),
    ]);

    if (error) {
      return { data: null, error: error.message };
    }

    const subjects = new Map(
      (subjectRows ?? []).map((row) => [row.id, { name: row.name, color: row.color }]),
    );

    const totals = new Map<string, { total: number; due: number }>();
    for (const row of cardRows ?? []) {
      const entry = totals.get(row.subject_id) ?? { total: 0, due: 0 };
      entry.total += 1;
      if (row.due_date <= todayIso) entry.due += 1;
      totals.set(row.subject_id, entry);
    }

    const decks: FlashcardDeckSummary[] = [...totals.entries()].map(([subjectId, counts]) => {
      const subject = subjects.get(subjectId);
      return {
        subjectId,
        subjectName: subject?.name ?? "Unknown subject",
        subjectColor: subject?.color ?? "#94a3b8",
        totalCards: counts.total,
        dueCount: counts.due,
      };
    });

    decks.sort((a, b) => a.subjectName.localeCompare(b.subjectName));
    return { data: decks, error: null };
  },

  /** Cards due today, optionally scoped to one subject or lesson. Backs the review runner. */
  async getDueQueue(params?: {
    subjectId?: string;
    lessonId?: string;
  }): Promise<ActionResult<FlashcardWithRelations[]>> {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return { data: [], error: null };
    }

    const todayIso = format(new Date(), "yyyy-MM-dd");

    let query = supabase
      .from("flashcards")
      .select("*")
      .eq("user_id", authData.user.id)
      .lte("due_date", todayIso)
      .order("due_date", { ascending: true })
      .limit(REVIEW_QUEUE_LIMIT);

    if (params?.lessonId) {
      query = query.eq("lesson_id", params.lessonId);
    } else if (params?.subjectId) {
      query = query.eq("subject_id", params.subjectId);
    }

    const { data: rows, error } = await query;

    if (error) {
      return { data: null, error: error.message };
    }

    const cards = await attachRelations(supabase, rows ?? []);
    return { data: cards, error: null };
  },

  create: createFlashcard,
  update: updateFlashcard,
  remove: deleteFlashcard,
  recordReview: recordFlashcardReview,
};
