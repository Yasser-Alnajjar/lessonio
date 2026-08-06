import type { AuditFields, UUID } from "./common";

export const ATTENDANCE_STATUSES = [
  "attended",
  "absent",
  "late",
  "cancelled",
] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

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

export const LESSON_EXAM_STATUSES = ["none", "upcoming", "completed"] as const;
export type LessonExamStatus = (typeof LESSON_EXAM_STATUSES)[number];

export interface Lesson extends AuditFields {
  id: UUID;
  userId: UUID;
  subjectId: UUID;
  title: string;
  teacher: string | null;
  location: string | null;
  date: string; // ISO date, "2026-08-06"
  time: string; // "14:30"
  durationMinutes: number;
  attendanceStatus: AttendanceStatus;
  studyStatus: StudyStatus;
  reviewStatus: ReviewStatus;
  homeworkStatus: LessonHomeworkStatus;
  examStatus: LessonExamStatus;
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
  title: string;
  teacher?: string;
  location?: string;
  date: string;
  time: string;
  durationMinutes: number;
  tagIds?: UUID[];
}

export type UpdateLessonInput = Partial<CreateLessonInput> & {
  attendanceStatus?: AttendanceStatus;
  studyStatus?: StudyStatus;
  reviewStatus?: ReviewStatus;
  homeworkStatus?: LessonHomeworkStatus;
  examStatus?: LessonExamStatus;
  isArchived?: boolean;
};

export interface LessonFilters {
  subjectId?: UUID;
  attendanceStatus?: AttendanceStatus;
  studyStatus?: StudyStatus;
  reviewStatus?: ReviewStatus;
  teacher?: string;
  tagIds?: UUID[];
  dateFrom?: string;
  dateTo?: string;
}
