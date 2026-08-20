import "server-only";

import { format, parseISO, startOfMonth, subMonths } from "date-fns";
import { getLocale } from "next-intl/server";

import { average, parseGradeScale, percentageToGrade, weightedGpa } from "@/lib/grades/scale";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/common";
import type { ChartPoint } from "@/lib/types/statistics";
import type { GradesOverviewData, SubjectGradeSummary } from "@/lib/types/grade";

const MONTHS_WINDOW = 6;

interface RawExamRow {
  subject_id: string;
  percentage: number | null;
  date: string;
}

interface RawSubjectRow {
  id: string;
  name: string;
  color: string;
  credit_hours: number;
}

function buildTrend(exams: RawExamRow[], locale: string): ChartPoint[] {
  const today = new Date();
  const percentagesByMonth = new Map<string, number[]>();
  for (let i = 0; i < MONTHS_WINDOW; i++) {
    percentagesByMonth.set(
      format(startOfMonth(subMonths(today, MONTHS_WINDOW - 1 - i)), "yyyy-MM"),
      [],
    );
  }

  for (const exam of exams) {
    if (exam.percentage === null) continue;
    const monthKey = format(parseISO(exam.date), "yyyy-MM");
    const bucket = percentagesByMonth.get(monthKey);
    if (!bucket) continue;
    bucket.push(exam.percentage);
  }

  return [...percentagesByMonth.entries()].map(([month, percentages]) => ({
    label: new Intl.DateTimeFormat(locale, { month: "short" }).format(parseISO(`${month}-01`)),
    value: Math.round(average(percentages) ?? 0),
  }));
}

export const gradesActions = {
  async getOverview(): Promise<ActionResult<GradesOverviewData>> {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return { data: { subjects: [], gpa: null, trend: [] }, error: null };
    }

    const userId = authData.user.id;
    const locale = await getLocale();

    const windowStart = format(startOfMonth(subMonths(new Date(), MONTHS_WINDOW - 1)), "yyyy-MM-dd");

    const [{ data: subjectRows, error: subjectsError }, { data: examRows, error: examsError }, { data: settingsRow }] =
      await Promise.all([
        supabase
          .from("subjects")
          .select("id, name, color, credit_hours")
          .eq("user_id", userId)
          .eq("is_archived", false),
        supabase
          .from("exams")
          .select("subject_id, percentage, date")
          .eq("user_id", userId)
          .not("percentage", "is", null)
          .gte("date", windowStart),
        supabase.from("settings").select("grade_scale").eq("user_id", userId).maybeSingle(),
      ]);

    if (subjectsError) return { data: null, error: subjectsError.message };
    if (examsError) return { data: null, error: examsError.message };

    const subjects = (subjectRows ?? []) as RawSubjectRow[];
    const exams = (examRows ?? []) as RawExamRow[];
    const scale = parseGradeScale(settingsRow?.grade_scale ?? null);

    const examsBySubject = new Map<string, RawExamRow[]>();
    for (const exam of exams) {
      const bucket = examsBySubject.get(exam.subject_id) ?? [];
      bucket.push(exam);
      examsBySubject.set(exam.subject_id, bucket);
    }

    const subjectSummaries: SubjectGradeSummary[] = subjects.map((subject) => {
      const subjectExams = examsBySubject.get(subject.id) ?? [];
      const percentages = subjectExams
        .map((exam) => exam.percentage)
        .filter((value): value is number => value !== null);
      const avg = average(percentages);
      const grade = avg === null ? null : percentageToGrade(avg, scale);

      return {
        subjectId: subject.id,
        subjectName: subject.name,
        subjectColor: subject.color,
        creditHours: subject.credit_hours,
        examCount: percentages.length,
        average: avg === null ? null : Math.round(avg * 10) / 10,
        letter: grade?.letter ?? null,
        gradePoints: grade?.gradePoints ?? null,
      };
    });

    subjectSummaries.sort((a, b) => a.subjectName.localeCompare(b.subjectName));

    const gpa = weightedGpa(
      subjectSummaries.map((s) => ({ average: s.average, creditHours: s.creditHours })),
      scale,
    );

    return {
      data: {
        subjects: subjectSummaries,
        gpa,
        trend: buildTrend(exams, locale),
      },
      error: null,
    };
  },
};
