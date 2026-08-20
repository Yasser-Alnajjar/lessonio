import type { ChartPoint } from "./statistics";
import type { UUID } from "./common";

export interface GradeScaleEntry {
  letter: string;
  minPercent: number;
  gradePoints: number;
}

/** Standard A-F / 4.0 scale — mirrors the default in the `grades` migration. */
export const DEFAULT_GRADE_SCALE: GradeScaleEntry[] = [
  { letter: "A", minPercent: 90, gradePoints: 4 },
  { letter: "B", minPercent: 80, gradePoints: 3 },
  { letter: "C", minPercent: 70, gradePoints: 2 },
  { letter: "D", minPercent: 60, gradePoints: 1 },
  { letter: "F", minPercent: 0, gradePoints: 0 },
];

export interface SubjectGradeSummary {
  subjectId: UUID;
  subjectName: string;
  subjectColor: string;
  creditHours: number;
  examCount: number;
  /** Average percentage across the subject's scored exams — null when none are scored yet. */
  average: number | null;
  letter: string | null;
  gradePoints: number | null;
}

export interface GradesOverviewData {
  subjects: SubjectGradeSummary[];
  gpa: number | null;
  /** Average exam percentage per month, last 6 months — same shape as statistics charts. */
  trend: ChartPoint[];
}
