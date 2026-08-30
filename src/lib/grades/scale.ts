import type { Json } from "@/lib/types/common";
import { DEFAULT_GRADE_SCALE, type GradeScaleEntry } from "@/lib/types/grade";

/**
 * `settings.grade_scale` is a jsonb column, so Postgres types it as
 * unstructured `Json`. Parse defensively and fall back to the default scale
 * rather than trusting the shape — same convention as `parseNotificationPreferences`.
 */
export function parseGradeScale(value: Json | null): GradeScaleEntry[] {
  if (!Array.isArray(value) || value.length === 0) {
    return DEFAULT_GRADE_SCALE;
  }

  const entries = value
    .filter(
      (entry): entry is Record<string, Json> =>
        typeof entry === "object" && entry !== null && !Array.isArray(entry),
    )
    .map((entry) => ({
      letter: typeof entry.letter === "string" ? entry.letter : "",
      minPercent: typeof entry.minPercent === "number" ? entry.minPercent : NaN,
      gradePoints:
        typeof entry.gradePoints === "number" ? entry.gradePoints : NaN,
    }))
    .filter(
      (entry) =>
        entry.letter.length > 0 &&
        !Number.isNaN(entry.minPercent) &&
        !Number.isNaN(entry.gradePoints),
    );

  return entries.length > 0 ? entries : DEFAULT_GRADE_SCALE;
}

/** Scale entries don't need to be pre-sorted — this always checks the highest threshold first. */
export function percentageToGrade(
  percentage: number,
  scale: GradeScaleEntry[],
): GradeScaleEntry | null {
  const sorted = [...scale].sort((a, b) => b.minPercent - a.minPercent);
  return sorted.find((entry) => percentage >= entry.minPercent) ?? null;
}

export function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Credit-weighted GPA across subjects with at least one scored exam. Subjects with no scored exams don't count toward the total credits. */
export function weightedGpa(
  subjects: Array<{ average: number | null; creditHours: number }>,
  scale: GradeScaleEntry[],
): number | null {
  const graded = subjects.filter(
    (subject): subject is { average: number; creditHours: number } =>
      subject.average !== null,
  );
  if (graded.length === 0) return null;

  const totalCredits = graded.reduce(
    (sum, subject) => sum + subject.creditHours,
    0,
  );
  if (totalCredits === 0) return null;

  const totalPoints = graded.reduce((sum, subject) => {
    const grade = percentageToGrade(subject.average, scale);
    return sum + (grade?.gradePoints ?? 0) * subject.creditHours;
  }, 0);

  return Math.round((totalPoints / totalCredits) * 100) / 100;
}
