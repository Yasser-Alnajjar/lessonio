import type { AuditFields, UUID } from "./common";
import type { SubjectIcon } from "./subject";

export const ATTENDANCE_STATUSES = [
  "attended",
  "absent",
  "late",
  "cancelled",
] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const CLASS_EXAM_STATUSES = ["none", "upcoming", "completed"] as const;
export type ClassExamStatus = (typeof CLASS_EXAM_STATUSES)[number];

/**
 * A real-world scheduled class session on a specific date — distinct from a
 * `Lesson`, which is the student's own self-managed study item. `attendance
 * Status` is `null` until recorded, which is the state of every future
 * occurrence materialized from a `ClassSchedule` and of a standalone class
 * nobody has marked yet.
 */
export interface Class extends AuditFields {
  id: UUID;
  userId: UUID;
  subjectId: UUID;
  classScheduleId: UUID | null;
  date: string; // ISO date, "2026-08-06"
  startTime: string; // "14:30"
  durationMinutes: number;
  teacher: string | null;
  location: string | null;
  attendanceStatus: AttendanceStatus | null;
  examStatus: ClassExamStatus;
}

export interface ClassWithRelations extends Class {
  subjectName: string;
  subjectColor: string;
  subjectIcon: SubjectIcon;
}

export interface CreateClassInput {
  subjectId: UUID;
  classScheduleId?: UUID;
  date: string;
  startTime: string;
  durationMinutes: number;
  teacher?: string;
  location?: string;
}

export type UpdateClassInput = Partial<CreateClassInput> & {
  attendanceStatus?: AttendanceStatus | null;
  examStatus?: ClassExamStatus;
};

export interface ClassFilters {
  subjectId?: UUID;
  attendanceStatus?: AttendanceStatus;
  examStatus?: ClassExamStatus;
  teacher?: string;
  dateFrom?: string;
  dateTo?: string;
}
