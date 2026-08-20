import "server-only";

import {
  differenceInCalendarDays,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns";
import { getLocale, getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/common";
import { calculateExamPercentage } from "@/lib/types/exam";
import type { AttendanceStatus } from "@/lib/types/class-occurrence";
import type {
  ChartPoint,
  HeatMapCell,
  StatCard,
  StatisticsOverviewData,
  SubjectDistributionPoint,
} from "@/lib/types/statistics";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const MONTHS_WINDOW = 6;
const WEEK_LENGTH_DAYS = 7;
const HEATMAP_WEEKS = 12;
const STUDY_PROGRESS_WEEKS = 8;

interface RawLessonRow {
  date: string;
  subject_id: string;
  study_status: string;
}

interface RawClassOccurrenceRow {
  date: string;
  duration_minutes: number;
  subject_id: string;
  attendance_status: string | null;
}

interface RawSessionRow {
  started_at: string;
  duration_minutes: number | null;
}

async function fetchRawData(supabase: SupabaseServerClient, userId: string) {
  const today = new Date();
  const windowStart = format(
    startOfMonth(subMonths(today, MONTHS_WINDOW - 1)),
    "yyyy-MM-dd",
  );

  const [
    { data: lessonRows },
    { data: classRows },
    { data: sessionRows },
    { data: homeworkRows },
    { data: examRows },
    { data: subjectRows },
  ] = await Promise.all([
    supabase
      .from("lessons")
      .select("date, subject_id, study_status")
      .eq("user_id", userId)
      .eq("is_archived", false)
      .gte("date", windowStart),
    supabase
      .from("class_occurrences")
      .select("date, duration_minutes, subject_id, attendance_status")
      .eq("user_id", userId)
      .gte("date", windowStart),
    supabase
      .from("study_sessions")
      .select("started_at, duration_minutes")
      .eq("user_id", userId)
      .gte("started_at", windowStart),
    supabase.from("homework").select("completed").eq("user_id", userId),
    supabase
      .from("exams")
      .select("score, total_score")
      .eq("user_id", userId)
      .not("score", "is", null),
    supabase
      .from("subjects")
      .select("id, name, color")
      .eq("user_id", userId)
      .eq("is_archived", false),
  ]);

  return {
    lessons: (lessonRows ?? []) as RawLessonRow[],
    classes: (classRows ?? []) as RawClassOccurrenceRow[],
    sessions: (sessionRows ?? []) as RawSessionRow[],
    homework: homeworkRows ?? [],
    exams: examRows ?? [],
    subjects: subjectRows ?? [],
  };
}

function computeStreak(sessionDates: string[]): number {
  const dateSet = new Set(sessionDates);
  const todayIso = format(new Date(), "yyyy-MM-dd");
  let cursor = dateSet.has(todayIso) ? new Date() : subDays(new Date(), 1);
  let streak = 0;
  while (dateSet.has(format(cursor, "yyyy-MM-dd"))) {
    streak++;
    cursor = subDays(cursor, 1);
  }
  return streak;
}

async function buildStatCards(
  lessons: RawLessonRow[],
  classes: RawClassOccurrenceRow[],
  sessions: RawSessionRow[],
  homework: Array<{ completed: boolean }>,
  exams: Array<{ score: number | null; total_score: number }>,
): Promise<StatCard[]> {
  const t = await getTranslations("statistics.cards");
  const suffix = await getTranslations("statistics.cardSuffix");

  const monthStartIso = format(startOfMonth(new Date()), "yyyy-MM-dd");

  const studyMinutesThisMonth = sessions
    .filter((session) => session.started_at >= monthStartIso)
    .reduce((sum, session) => sum + (session.duration_minutes ?? 0), 0);

  const recordedClasses = classes.filter(
    (klass) => klass.attendance_status !== null,
  );
  const attendanceRate =
    recordedClasses.length > 0
      ? Math.round(
          (recordedClasses.filter(
            (klass) => klass.attendance_status === "attended",
          ).length /
            recordedClasses.length) *
            100,
        )
      : 0;

  const homeworkCompletion =
    homework.length > 0
      ? Math.round(
          (homework.filter((item) => item.completed).length / homework.length) *
            100,
        )
      : 0;

  const examPercentages = exams
    .map((exam) => calculateExamPercentage(exam.score, exam.total_score))
    .filter((value): value is number => value !== null);
  const avgExamScore =
    examPercentages.length > 0
      ? Math.round(
          examPercentages.reduce((sum, value) => sum + value, 0) /
            examPercentages.length,
        )
      : 0;

  const currentStreak = computeStreak(
    sessions.map((session) =>
      format(parseISO(session.started_at), "yyyy-MM-dd"),
    ),
  );

  const lessonsCompletedThisMonth = lessons.filter(
    (lesson) =>
      lesson.date >= monthStartIso && lesson.study_status === "completed",
  ).length;

  return [
    {
      key: "studyTimeThisMonth",
      label: t("studyTimeThisMonth"),
      value: Math.round((studyMinutesThisMonth / 60) * 10) / 10,
      suffix: suffix("hours"),
    },
    {
      key: "attendanceRate",
      label: t("attendanceRate"),
      value: attendanceRate,
      suffix: "%",
    },
    {
      key: "homeworkCompletion",
      label: t("homeworkCompletion"),
      value: homeworkCompletion,
      suffix: "%",
    },
    {
      key: "avgExamScore",
      label: t("avgExamScore"),
      value: avgExamScore,
      suffix: "%",
    },
    {
      key: "currentStreak",
      label: t("currentStreak"),
      value: currentStreak,
      suffix: suffix("days"),
    },
    {
      key: "lessonsCompleted",
      label: t("lessonsCompleted"),
      value: lessonsCompletedThisMonth,
    },
  ];
}

function buildWeeklyStudyTime(
  sessions: RawSessionRow[],
  locale: string,
): ChartPoint[] {
  const today = new Date();
  const minutesByDate = new Map<string, number>();
  for (let i = 0; i < WEEK_LENGTH_DAYS; i++) {
    minutesByDate.set(
      format(subDays(today, WEEK_LENGTH_DAYS - 1 - i), "yyyy-MM-dd"),
      0,
    );
  }

  for (const session of sessions) {
    const dateKey = format(parseISO(session.started_at), "yyyy-MM-dd");
    if (!minutesByDate.has(dateKey)) continue;
    minutesByDate.set(
      dateKey,
      (minutesByDate.get(dateKey) ?? 0) + (session.duration_minutes ?? 0),
    );
  }

  return [...minutesByDate.entries()].map(([date, minutes]) => ({
    label: new Intl.DateTimeFormat(locale, { weekday: "short" }).format(
      parseISO(date),
    ),
    value: minutes,
  }));
}

function buildMonthlyLessons(
  lessons: RawLessonRow[],
  locale: string,
): ChartPoint[] {
  const today = new Date();
  const countByMonth = new Map<string, number>();
  for (let i = 0; i < MONTHS_WINDOW; i++) {
    countByMonth.set(
      format(startOfMonth(subMonths(today, MONTHS_WINDOW - 1 - i)), "yyyy-MM"),
      0,
    );
  }

  for (const lesson of lessons) {
    const monthKey = format(parseISO(lesson.date), "yyyy-MM");
    if (!countByMonth.has(monthKey)) continue;
    countByMonth.set(monthKey, (countByMonth.get(monthKey) ?? 0) + 1);
  }

  return [...countByMonth.entries()].map(([month, count]) => ({
    label: new Intl.DateTimeFormat(locale, { month: "short" }).format(
      parseISO(`${month}-01`),
    ),
    value: count,
  }));
}

function buildMonthlyGrowth(
  sessions: RawSessionRow[],
  locale: string,
): ChartPoint[] {
  const today = new Date();
  const minutesByMonth = new Map<string, number>();
  for (let i = 0; i < MONTHS_WINDOW; i++) {
    minutesByMonth.set(
      format(startOfMonth(subMonths(today, MONTHS_WINDOW - 1 - i)), "yyyy-MM"),
      0,
    );
  }

  for (const session of sessions) {
    const monthKey = format(parseISO(session.started_at), "yyyy-MM");
    if (!minutesByMonth.has(monthKey)) continue;
    minutesByMonth.set(
      monthKey,
      (minutesByMonth.get(monthKey) ?? 0) + (session.duration_minutes ?? 0),
    );
  }

  return [...minutesByMonth.entries()].map(([month, minutes]) => ({
    label: new Intl.DateTimeFormat(locale, { month: "short" }).format(
      parseISO(`${month}-01`),
    ),
    value: Math.round((minutes / 60) * 10) / 10,
  }));
}

async function buildAttendanceBreakdown(
  classes: RawClassOccurrenceRow[],
): Promise<ChartPoint[]> {
  const t = await getTranslations("statistics.attendance");
  const statuses: AttendanceStatus[] = [
    "attended",
    "absent",
    "late",
    "cancelled",
  ];
  const recordedClasses = classes.filter(
    (klass) => klass.attendance_status !== null,
  );

  return statuses.map((status) => ({
    label: t(status),
    value: recordedClasses.filter((klass) => klass.attendance_status === status)
      .length,
  }));
}

function buildSubjectDistribution(
  classes: RawClassOccurrenceRow[],
  subjects: Array<{ id: string; name: string; color: string }>,
): SubjectDistributionPoint[] {
  const subjectMap = new Map(subjects.map((subject) => [subject.id, subject]));
  const minutesBySubject = new Map<string, number>();

  for (const klass of classes) {
    minutesBySubject.set(
      klass.subject_id,
      (minutesBySubject.get(klass.subject_id) ?? 0) + klass.duration_minutes,
    );
  }

  return [...minutesBySubject.entries()]
    .map(([subjectId, minutes]) => {
      const subject = subjectMap.get(subjectId);
      return {
        subjectName: subject?.name ?? "Unknown",
        subjectColor: subject?.color ?? "#94a3b8",
        value: minutes,
      };
    })
    .filter((point) => point.value > 0)
    .sort((a, b) => b.value - a.value);
}

function buildStudyProgress(
  sessions: RawSessionRow[],
  locale: string,
): ChartPoint[] {
  const today = new Date();
  const minutesByWeek = new Map<string, number>();
  for (let i = 0; i < STUDY_PROGRESS_WEEKS; i++) {
    const weekStart = startOfWeek(
      subWeeks(today, STUDY_PROGRESS_WEEKS - 1 - i),
      { weekStartsOn: 1 },
    );
    minutesByWeek.set(format(weekStart, "yyyy-MM-dd"), 0);
  }

  for (const session of sessions) {
    const weekStart = format(
      startOfWeek(parseISO(session.started_at), { weekStartsOn: 1 }),
      "yyyy-MM-dd",
    );
    if (!minutesByWeek.has(weekStart)) continue;
    minutesByWeek.set(
      weekStart,
      (minutesByWeek.get(weekStart) ?? 0) + (session.duration_minutes ?? 0),
    );
  }

  let cumulativeMinutes = 0;
  return [...minutesByWeek.entries()].map(([weekStart, minutes]) => {
    cumulativeMinutes += minutes;
    return {
      label: new Intl.DateTimeFormat(locale, {
        month: "short",
        day: "numeric",
      }).format(parseISO(weekStart)),
      value: Math.round((cumulativeMinutes / 60) * 10) / 10,
    };
  });
}

function buildHeatMap(sessions: RawSessionRow[]): HeatMapCell[] {
  const today = new Date();
  const rangeStart = startOfWeek(subWeeks(today, HEATMAP_WEEKS - 1), {
    weekStartsOn: 1,
  });
  const days = differenceInCalendarDays(today, rangeStart) + 1;
  const minutesByDate = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    minutesByDate.set(format(subDays(today, days - 1 - i), "yyyy-MM-dd"), 0);
  }

  for (const session of sessions) {
    const dateKey = format(parseISO(session.started_at), "yyyy-MM-dd");
    if (!minutesByDate.has(dateKey)) continue;
    minutesByDate.set(
      dateKey,
      (minutesByDate.get(dateKey) ?? 0) + (session.duration_minutes ?? 0),
    );
  }

  return [...minutesByDate.entries()].map(([date, minutes]) => ({
    date,
    intensity: minutesToIntensity(minutes),
  }));
}

function minutesToIntensity(minutes: number): number {
  if (minutes <= 0) return 0;
  if (minutes < 30) return 1;
  if (minutes < 60) return 2;
  if (minutes < 120) return 3;
  return 4;
}

function buildDailyActivity(
  sessions: RawSessionRow[],
  locale: string,
): ChartPoint[] {
  const totalsByWeekday = new Array(7).fill(0) as number[];
  const countsByWeekday = new Array(7).fill(0) as number[];

  for (const session of sessions) {
    const date = parseISO(session.started_at);
    const weekday = date.getDay();
    totalsByWeekday[weekday] =
      (totalsByWeekday[weekday] ?? 0) + (session.duration_minutes ?? 0);
    countsByWeekday[weekday] = (countsByWeekday[weekday] ?? 0) + 1;
  }

  const referenceSunday = startOfWeek(new Date(), { weekStartsOn: 0 });

  return totalsByWeekday.map((total, weekday) => {
    const count = countsByWeekday[weekday] ?? 0;
    return {
      label: new Intl.DateTimeFormat(locale, { weekday: "short" }).format(
        subDays(referenceSunday, -weekday),
      ),
      value: count > 0 ? Math.round(total / count) : 0,
    };
  });
}

export const statisticsActions = {
  async getOverview(): Promise<ActionResult<StatisticsOverviewData>> {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return { data: null, error: null };
    }

    const userId = authData.user.id;
    const locale = await getLocale();
    const { lessons, classes, sessions, homework, exams, subjects } =
      await fetchRawData(supabase, userId);

    const [cards, attendanceBreakdown] = await Promise.all([
      buildStatCards(lessons, classes, sessions, homework, exams),
      buildAttendanceBreakdown(classes),
    ]);

    return {
      data: {
        cards,
        weeklyStudyTime: buildWeeklyStudyTime(sessions, locale),
        monthlyLessons: buildMonthlyLessons(lessons, locale),
        attendanceBreakdown,
        subjectDistribution: buildSubjectDistribution(classes, subjects),
        studyProgress: buildStudyProgress(sessions, locale),
        heatMap: buildHeatMap(sessions),
        dailyActivity: buildDailyActivity(sessions, locale),
        monthlyGrowth: buildMonthlyGrowth(sessions, locale),
      },
      error: null,
    };
  },
};
