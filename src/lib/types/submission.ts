import type { AuditFields, UUID } from "./common";

export const SUBMISSION_STATUSES = ["assigned", "submitted", "graded"] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export interface AssignmentSubmission extends AuditFields {
  id: UUID;
  assignmentId: UUID;
  studentId: UUID;
  content: string;
  submittedAt: string;
  score: number | null;
  feedback: string | null;
  gradedAt: string | null;
  gradedBy: UUID | null;
}

/** The student's own view of their submission, with status derived in the mapper. */
export interface MySubmission extends AssignmentSubmission {
  status: SubmissionStatus;
}

/**
 * One row of the teacher's grading queue for an assignment: every actively
 * enrolled student, joined with their submission if one exists. A student
 * with no row here is "assigned" rather than omitted — the queue must show
 * who hasn't turned work in.
 */
export interface SubmissionQueueEntry {
  studentId: UUID;
  fullName: string | null;
  avatarUrl: string | null;
  status: SubmissionStatus;
  submission: AssignmentSubmission | null;
}

export interface SubmitAssignmentInput {
  content: string;
}

export interface GradeSubmissionInput {
  score: number;
  feedback?: string;
}
