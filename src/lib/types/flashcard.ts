import type { FlashcardGrade } from "@/lib/flashcards/sm2";
import type { AuditFields, UUID } from "./common";

export interface Flashcard extends AuditFields {
  id: UUID;
  userId: UUID;
  lessonId: UUID;
  subjectId: UUID;
  front: string;
  back: string;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  dueDate: string; // ISO date
  lastReviewedAt: string | null;
}

export interface FlashcardWithRelations extends Flashcard {
  subjectName: string;
  subjectColor: string;
  lessonTitle: string;
}

export interface FlashcardReview {
  id: UUID;
  userId: UUID;
  flashcardId: UUID;
  quality: number;
  reviewedAt: string;
}

export interface CreateFlashcardInput {
  lessonId: UUID;
  front: string;
  back: string;
}

export type UpdateFlashcardInput = Partial<
  Pick<CreateFlashcardInput, "front" | "back">
>;

export type { FlashcardGrade };

/** Per-subject rollup for the deck browser — counts due today vs. total. */
export interface FlashcardDeckSummary {
  subjectId: UUID;
  subjectName: string;
  subjectColor: string;
  totalCards: number;
  dueCount: number;
}
