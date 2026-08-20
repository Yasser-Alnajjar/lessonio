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
 * One dated instance of a recurring `Class`, materialized from that class's
 * `meetings` by `ensureClassOccurrencesForUser()`.
 *
 * Attendance and exam state live here rather than on the `Class` because
 * they differ every week: this Monday's Math can be `attended` while next
 * Monday's is still unrecorded. `attendanceStatus` is `null` until the
 * student records it, which is the state of every freshly materialized
 * occurrence.
 *
 * `startTime`/`durationMinutes` are snapshotted at materialization time, so
 * editing the class's schedule never rewrites the timing of occurrences that
 * already happened. Teacher and location are *not* duplicated here — they
 * belong to the class and are read through the join.
 */
export interface ClassOccurrence extends AuditFields {
  id: UUID;
  userId: UUID;
  classId: UUID;
  subjectId: UUID;
  date: string; // ISO date, "2026-08-24"
  startTime: string; // "16:00"
  durationMinutes: number;
  attendanceStatus: AttendanceStatus | null;
  examStatus: ClassExamStatus;
}

export interface ClassOccurrenceWithRelations extends ClassOccurrence {
  subjectName: string;
  subjectColor: string;
  subjectIcon: SubjectIcon;
  teacher: string | null;
  location: string | null;
}

/**
 * The only mutable state on an occurrence. Occurrences are never created or
 * deleted by hand — they are derived from the recurring class — so there is
 * no create input.
 */
export interface UpdateClassOccurrenceInput {
  attendanceStatus?: AttendanceStatus | null;
  examStatus?: ClassExamStatus;
}

export interface ClassOccurrenceFilters {
  classId?: UUID;
  subjectId?: UUID;
  attendanceStatus?: AttendanceStatus;
  examStatus?: ClassExamStatus;
  dateFrom?: string;
  dateTo?: string;
}
