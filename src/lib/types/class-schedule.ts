import type { AuditFields, UUID } from "./common";
import type { SubjectIcon } from "./subject";

/**
 * Canonical weekday convention for `dayOfWeek`, centralized here so no
 * other file (UI, validation, or actions) hardcodes the mapping:
 * 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday,
 * 5 = Friday, 6 = Saturday.
 */
export const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;
export type Weekday = (typeof WEEKDAYS)[number];

/**
 * One recurring weekly occurrence of a class — its own day, start time, and
 * duration. A `ClassSchedule` holds several of these so the same class can
 * meet at different times on different days (e.g. Thursday 4pm for two
 * hours, Sunday 2pm for ninety minutes).
 */
export interface ClassScheduleEntry {
  dayOfWeek: Weekday;
  startTime: string; // "16:00"
  durationMinutes: number;
}

/**
 * A recurring class the student attends (when/where), as opposed to a
 * `Lesson`, which records what was actually studied on a given date.
 * `teacher`/`location` apply to the class as a whole; day-by-day timing
 * lives in `schedules`.
 */
export interface ClassSchedule extends AuditFields {
  id: UUID;
  userId: UUID;
  subjectId: UUID;
  teacher: string | null;
  location: string | null;
  schedules: ClassScheduleEntry[];
  startsOn: string; // ISO date, "2026-08-16"
  endsOn: string | null;
  isActive: boolean;
}

export interface ClassScheduleWithSubject extends ClassSchedule {
  subjectName: string;
  subjectColor: string;
  subjectIcon: SubjectIcon;
}

export interface CreateClassScheduleEntryInput {
  /**
   * `number` (not `Weekday`) so this input type matches the Zod schema's
   * inferred output 1:1 — `zodResolver` can't propagate a `.refine()`
   * type-predicate narrowing through `react-hook-form`'s generics, so the
   * schema validates the 0-6 range at runtime instead of the type level.
   * `ClassScheduleEntry.dayOfWeek` (the read side, mapped from the DB)
   * stays `Weekday`.
   */
  dayOfWeek: number;
  startTime: string;
  durationMinutes: number;
}

export interface CreateClassScheduleInput {
  subjectId: UUID;
  teacher?: string;
  location?: string;
  schedules: CreateClassScheduleEntryInput[];
  startsOn: string;
  endsOn?: string;
  /** Defaults to `true` (the DB column default) when omitted. */
  isActive?: boolean;
}

export type UpdateClassScheduleInput = Partial<CreateClassScheduleInput>;
