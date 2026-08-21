import type { AuditFields, UUID } from "./common";

export const ENROLLMENT_STATUSES = ["active", "removed"] as const;
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];

export interface Enrollment extends AuditFields {
  id: UUID;
  teacherClassId: UUID;
  studentId: UUID;
  status: EnrollmentStatus;
  joinedAt: string;
}

/** The teacher's view of one class: `Enrollment` joined with the student's profile. */
export interface RosterEntry {
  studentId: UUID;
  fullName: string | null;
  avatarUrl: string | null;
  status: EnrollmentStatus;
  joinedAt: string;
}

/** The student's view of a class they're enrolled in, joined with the teacher's own name. */
export interface EnrolledClass {
  teacherClassId: UUID;
  name: string;
  subjectLabel: string | null;
  teacherName: string | null;
  status: EnrollmentStatus;
  joinedAt: string;
}

export interface JoinClassInput {
  code: string;
}
