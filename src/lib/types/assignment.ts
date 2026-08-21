import type { AuditFields, UUID } from "./common";

export const ASSIGNMENT_STATUSES = ["draft", "published"] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

export interface Assignment extends AuditFields {
  id: UUID;
  teacherClassId: UUID;
  teacherId: UUID;
  title: string;
  instructions: string | null;
  dueAt: string;
  totalPoints: number;
  status: AssignmentStatus;
  publishedAt: string | null;
}

/** The teacher's view of one assignment, joined with its class name. */
export interface AssignmentWithStats extends Assignment {
  className: string;
}

/** The student's view of a published assignment, joined with class + teacher name. */
export interface AssignmentForStudent {
  id: UUID;
  teacherClassId: UUID;
  title: string;
  instructions: string | null;
  dueAt: string;
  totalPoints: number;
  status: AssignmentStatus;
  publishedAt: string | null;
  className: string;
  teacherName: string | null;
}

export interface CreateAssignmentInput {
  teacherClassId: string;
  title: string;
  instructions?: string;
  dueAt: string;
  totalPoints: number;
}

export type UpdateAssignmentInput = Partial<
  Omit<CreateAssignmentInput, "teacherClassId">
>;
