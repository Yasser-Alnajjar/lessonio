import type { AuditFields, UUID } from "./common";

export const STUDY_STATUSES = [
  "not_started",
  "studying",
  "completed",
  "reviewed",
] as const;
export type StudyStatus = (typeof STUDY_STATUSES)[number];

export const REVIEW_STATUSES = [
  "not_reviewed",
  "needs_review",
  "reviewed",
] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const LESSON_HOMEWORK_STATUSES = [
  "none",
  "pending",
  "in_progress",
  "completed",
] as const;
export type LessonHomeworkStatus = (typeof LESSON_HOMEWORK_STATUSES)[number];

export interface Lesson extends AuditFields {
  id: UUID;
  userId: UUID;
  subjectId: UUID;
  classId: UUID | null;
  title: string;
  date: string; // ISO date, "2026-08-06"
  studyStatus: StudyStatus;
  reviewStatus: ReviewStatus;
  homeworkStatus: LessonHomeworkStatus;
  isArchived: boolean;
  tagIds: UUID[];
}

export interface LessonWithRelations extends Lesson {
  subjectName: string;
  subjectColor: string;
  tags: string[];
  noteCount: number;
  attachmentCount: number;
}

export interface CreateLessonInput {
  subjectId: UUID;
  classId?: UUID;
  title: string;
  date: string;
  tagIds?: UUID[];
}

export type UpdateLessonInput = Partial<CreateLessonInput> & {
  studyStatus?: StudyStatus;
  reviewStatus?: ReviewStatus;
  homeworkStatus?: LessonHomeworkStatus;
  isArchived?: boolean;
};

export interface LessonFilters {
  subjectId?: UUID;
  studyStatus?: StudyStatus;
  reviewStatus?: ReviewStatus;
  tagIds?: UUID[];
  dateFrom?: string;
  dateTo?: string;
}
