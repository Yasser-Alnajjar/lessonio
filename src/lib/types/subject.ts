import type { AuditFields, UUID } from "./common";

export type SubjectIcon =
  | "book-open"
  | "calculator"
  | "flask-conical"
  | "globe"
  | "landmark"
  | "palette"
  | "code"
  | "music"
  | "dumbbell"
  | "languages";

export interface Subject extends AuditFields {
  id: UUID;
  userId: UUID;
  name: string;
  color: string; // hex, e.g. "#6366F1"
  icon: SubjectIcon;
  isArchived: boolean;
  /** GPA weight — see src/lib/grades/scale.ts weightedGpa(). */
  creditHours: number;
}

/** Aggregated, derived stats — computed server-side, not stored directly. */
export interface SubjectStats {
  subjectId: UUID;
  totalLessons: number;
  attendanceRate: number; // 0-100
  studyRate: number; // 0-100
  homeworkProgress: number; // 0-100
  totalStudyMinutes: number;
}

export interface SubjectWithStats extends Subject {
  stats: SubjectStats;
}

export interface CreateSubjectInput {
  name: string;
  color: string;
  icon: SubjectIcon;
  creditHours: number;
}

export type UpdateSubjectInput = Partial<CreateSubjectInput> & {
  isArchived?: boolean;
};
