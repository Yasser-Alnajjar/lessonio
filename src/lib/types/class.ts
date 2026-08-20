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
 * One weekly slot a class meets in — its own day, start time, and duration.
 * A `Class` holds several of these so the same class can meet at different
 * times on different days (e.g. Thursday 4pm for two hours, Sunday 2pm for
 * ninety minutes).
 */
export interface ClassMeeting {
  dayOfWeek: Weekday;
  startTime: string; // "16:00"
  durationMinutes: number;
}

/**
 * A recurring weekly class the student attends — the single source of truth
 * for the domain. It repeats indefinitely: there is no start or end date,
 * and `isActive` is what pauses it. Each week it produces a
 * `ClassOccurrence`, which is where attendance and exam state live, because
 * those differ every week.
 */
export interface Class extends AuditFields {
  id: UUID;
  userId: UUID;
  subjectId: UUID;
  teacher: string | null;
  location: string | null;
  meetings: ClassMeeting[];
  isActive: boolean;
}

export interface ClassWithSubject extends Class {
  subjectName: string;
  subjectColor: string;
  subjectIcon: SubjectIcon;
}

export interface CreateClassMeetingInput {
  /**
   * `number` (not `Weekday`) so this input type matches the Zod schema's
   * inferred output 1:1 — `zodResolver` can't propagate a `.refine()`
   * type-predicate narrowing through `react-hook-form`'s generics, so the
   * schema validates the 0-6 range at runtime instead of the type level.
   * `ClassMeeting.dayOfWeek` (the read side, mapped from the DB) stays
   * `Weekday`.
   */
  dayOfWeek: number;
  startTime: string;
  durationMinutes: number;
}

export interface CreateClassInput {
  subjectId: UUID;
  teacher?: string;
  location?: string;
  meetings: CreateClassMeetingInput[];
  /** Defaults to `true` (the DB column default) when omitted. */
  isActive?: boolean;
}

export type UpdateClassInput = Partial<CreateClassInput>;
