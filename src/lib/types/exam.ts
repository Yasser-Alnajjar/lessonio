import type { AuditFields, UUID } from "./common";

export interface Exam extends AuditFields {
  id: UUID;
  userId: UUID;
  lessonId: UUID;
  subjectId: UUID;
  title: string;
  date: string; // ISO date
  score: number | null;
  totalScore: number;
}

export interface ExamWithRelations extends Exam {
  subjectName: string;
  subjectColor: string;
  lessonTitle: string;
  /** null while the exam hasn't been scored yet. */
  percentage: number | null;
}

export interface CreateExamInput {
  lessonId: UUID;
  title: string;
  date: string;
  totalScore: number;
  score?: number;
}

export type UpdateExamInput = Partial<CreateExamInput>;

/** Pure helper — percentage is always derived, never stored. */
export function calculateExamPercentage(
  score: number | null,
  totalScore: number,
): number | null {
  if (score === null || totalScore <= 0) return null;
  return Math.round((score / totalScore) * 100);
}
