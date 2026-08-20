import "server-only";

import { format, parseISO, differenceInCalendarDays, subDays } from "date-fns";

import { createClient } from "@/lib/supabase/server";
import { computeLevel, computeXp } from "@/lib/gamification/xp";
import type { ActionResult } from "@/lib/types/common";
import type {
  DashboardOverviewData,
  RecentActivityItem,
  WeeklyStudySummary,
} from "@/lib/types/dashboard";
import type { GamificationProgress } from "@/lib/types/gamification";
import type { ClassOccurrenceWithRelations } from "@/lib/types/class-occurrence";
import { classOccurrencesActions } from "./class-occurrences";
import { syncAndFetchUserAchievements } from "./gamification";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const UPCOMING_CLASS_LIMIT = 5;
const RECENT_ACTIVITY_LIMIT = 8;
const WEEK_LENGTH_DAYS = 7;

/**
 * Today's and the next few upcoming class occurrences for the dashboard.
 *
 * Delegates to `classOccurrencesActions.getAgenda()` rather than re-querying
 * `class_occurrences` here: that keeps the dashboard reading the exact same
 * Class domain as the Classes page (including the
 * `ensureClassOccurrencesForUser()` materialization it runs first), and it
 * queries today and upcoming as two separate buckets — a day packed with
 * classes used to consume a shared row limit and leave "Upcoming" empty.
 */
async function fetchClassAgenda(): Promise<{
  today: ClassOccurrenceWithRelations[];
  upcoming: ClassOccurrenceWithRelations[];
}> {
  const { data } =
    await classOccurrencesActions.getAgenda(UPCOMING_CLASS_LIMIT);
  return data ?? { today: [], upcoming: [] };
}

async function fetchRecentActivity(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<RecentActivityItem[]> {
  const [
    { data: completedLessons },
    { data: notes },
    { data: doneHomework },
    { data: scoredExams },
  ] = await Promise.all([
    supabase
      .from("lessons")
      .select("id, title, updated_at")
      .eq("user_id", userId)
      .eq("study_status", "completed")
      .order("updated_at", { ascending: false })
      .limit(RECENT_ACTIVITY_LIMIT),
    supabase
      .from("lesson_notes")
      .select("id, title, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(RECENT_ACTIVITY_LIMIT),
    supabase
      .from("homework")
      .select("id, title, updated_at")
      .eq("user_id", userId)
      .eq("completed", true)
      .order("updated_at", { ascending: false })
      .limit(RECENT_ACTIVITY_LIMIT),
    supabase
      .from("exams")
      .select("id, title, score, updated_at")
      .eq("user_id", userId)
      .not("score", "is", null)
      .order("updated_at", { ascending: false })
      .limit(RECENT_ACTIVITY_LIMIT),
  ]);

  const items: RecentActivityItem[] = [
    ...(completedLessons ?? []).map((row) => ({
      id: row.id,
      kind: "lesson_completed" as const,
      label: row.title,
      occurredAt: row.updated_at,
    })),
    ...(notes ?? []).map((row) => ({
      id: row.id,
      kind: "note_added" as const,
      label: row.title,
      occurredAt: row.created_at,
    })),
    ...(doneHomework ?? []).map((row) => ({
      id: row.id,
      kind: "homework_done" as const,
      label: row.title,
      occurredAt: row.updated_at,
    })),
    ...(scoredExams ?? []).map((row) => ({
      id: row.id,
      kind: "exam_scored" as const,
      label: row.title,
      occurredAt: row.updated_at,
    })),
  ];

  return items
    .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1))
    .slice(0, RECENT_ACTIVITY_LIMIT);
}

async function fetchWeeklySummary(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<WeeklyStudySummary> {
  const today = new Date();
  const windowStart = subDays(today, WEEK_LENGTH_DAYS - 1);

  const [{ data: sessions }, { data: goalRows }] = await Promise.all([
    supabase
      .from("study_sessions")
      .select("started_at, duration_minutes")
      .eq("user_id", userId)
      .gte("started_at", windowStart.toISOString()),
    supabase
      .from("goals")
      .select("target_minutes")
      .eq("user_id", userId)
      .eq("period", "weekly")
      .order("period_start", { ascending: false })
      .limit(1),
  ]);

  const minutesByDate = new Map<string, number>();
  for (let i = 0; i < WEEK_LENGTH_DAYS; i++) {
    minutesByDate.set(
      format(subDays(today, WEEK_LENGTH_DAYS - 1 - i), "yyyy-MM-dd"),
      0,
    );
  }

  for (const session of sessions ?? []) {
    if (!session.duration_minutes) continue;
    const dateKey = format(parseISO(session.started_at), "yyyy-MM-dd");
    if (!minutesByDate.has(dateKey)) continue;
    minutesByDate.set(
      dateKey,
      (minutesByDate.get(dateKey) ?? 0) + session.duration_minutes,
    );
  }

  const dayBreakdown = [...minutesByDate.entries()].map(([date, minutes]) => ({
    date,
    minutes,
  }));
  const totalMinutes = dayBreakdown.reduce((sum, day) => sum + day.minutes, 0);
  const targetMinutes = goalRows?.[0]?.target_minutes ?? 0;

  return { totalMinutes, targetMinutes, dayBreakdown };
}

function computeStreaks(sessionDates: string[]): {
  currentStreakDays: number;
  longestStreakDays: number;
} {
  const [firstDate, ...restDates] = [...new Set(sessionDates)].sort();
  if (!firstDate) {
    return { currentStreakDays: 0, longestStreakDays: 0 };
  }

  let longestStreakDays = 1;
  let run = 1;
  let previousDate = firstDate;
  for (const dateStr of restDates) {
    const gap = differenceInCalendarDays(
      parseISO(dateStr),
      parseISO(previousDate),
    );
    run = gap === 1 ? run + 1 : 1;
    longestStreakDays = Math.max(longestStreakDays, run);
    previousDate = dateStr;
  }

  const dateSet = new Set([firstDate, ...restDates]);
  const todayIso = format(new Date(), "yyyy-MM-dd");
  let cursor = dateSet.has(todayIso) ? new Date() : subDays(new Date(), 1);
  let currentStreakDays = 0;
  while (dateSet.has(format(cursor, "yyyy-MM-dd"))) {
    currentStreakDays++;
    cursor = subDays(cursor, 1);
  }

  return { currentStreakDays, longestStreakDays };
}

async function fetchProgress(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<GamificationProgress> {
  const [
    { data: sessions },
    { count: completedLessons },
    { count: completedHomework },
    { count: scoredExams },
    { count: aceExams },
    { count: flashcardReviews },
    achievements,
  ] = await Promise.all([
    supabase
      .from("study_sessions")
      .select("started_at, duration_minutes")
      .eq("user_id", userId),
    supabase
      .from("lessons")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("study_status", ["completed", "reviewed"]),
    supabase
      .from("homework")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("completed", true),
    supabase
      .from("exams")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .not("score", "is", null),
    supabase
      .from("exams")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("percentage", 90),
    supabase
      .from("flashcard_reviews")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    syncAndFetchUserAchievements(supabase, userId),
  ]);

  const { currentStreakDays, longestStreakDays } = computeStreaks(
    (sessions ?? []).map((row) =>
      format(parseISO(row.started_at), "yyyy-MM-dd"),
    ),
  );

  const studyMinutes = (sessions ?? []).reduce(
    (sum, row) => sum + (row.duration_minutes ?? 0),
    0,
  );
  const unlockedAchievements = achievements.filter(
    (item) => item.unlockedAt !== null,
  ).length;

  const xp = computeXp({
    completedLessons: completedLessons ?? 0,
    studyMinutes,
    completedHomework: completedHomework ?? 0,
    scoredExams: scoredExams ?? 0,
    aceExams: aceExams ?? 0,
    unlockedAchievements,
    flashcardReviews: flashcardReviews ?? 0,
  });
  const { level, xpToNextLevel } = computeLevel(xp);

  return { xp, level, xpToNextLevel, currentStreakDays, longestStreakDays };
}

async function fetchGreetingName(
  supabase: SupabaseServerClient,
  userId: string,
  authFullName: string | null,
  email: string,
): Promise<string> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .single();

  const fullName = profile?.full_name ?? authFullName;
  const firstName = fullName?.trim().split(/\s+/)[0];
  return firstName || email.split("@")[0] || "there";
}

/** Real Supabase queries, aggregated per-widget so one failing query never blanks the page. */
export const dashboardActions = {
  async getOverview(): Promise<ActionResult<DashboardOverviewData>> {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return { data: null, error: null };
    }

    const userId = authData.user.id;
    const authFullName =
      typeof authData.user.user_metadata.full_name === "string"
        ? authData.user.user_metadata.full_name
        : null;

    const [
      greetingName,
      { today, upcoming },
      recentActivity,
      weeklySummary,
      progress,
    ] = await Promise.all([
      fetchGreetingName(
        supabase,
        userId,
        authFullName,
        authData.user.email ?? "",
      ),
      fetchClassAgenda(),
      fetchRecentActivity(supabase, userId),
      fetchWeeklySummary(supabase, userId),
      fetchProgress(supabase, userId),
    ]);

    const overallProgressPercent =
      weeklySummary.targetMinutes > 0
        ? Math.min(
            100,
            Math.round(
              (weeklySummary.totalMinutes / weeklySummary.targetMinutes) * 100,
            ),
          )
        : 0;

    return {
      data: {
        greetingName,
        progress,
        overallProgressPercent,
        todayClasses: today,
        upcomingClasses: upcoming,
        recentActivity,
        weeklySummary,
      },
      error: null,
    };
  },
};
