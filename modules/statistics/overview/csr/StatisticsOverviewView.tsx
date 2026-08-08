"use client";

import useTranslate from "@/hooks/useTranslate";
import type { StatisticsOverviewData } from "@/lib/types/statistics";
import { AttendancePieChart } from "./attendance-pie-chart";
import { DailyActivityChart } from "./daily-activity-chart";
import { HeatMapChart } from "./heat-map-chart";
import { MonthlyGrowthChart } from "./monthly-growth-chart";
import { MonthlyLessonsChart } from "./monthly-lessons-chart";
import { StatCardsRow } from "./stat-cards-row";
import { StudyProgressChart } from "./study-progress-chart";
import { SubjectDistributionChart } from "./subject-distribution-chart";
import { WeeklyStudyTimeChart } from "./weekly-study-time-chart";

interface StatisticsOverviewViewProps {
  data: StatisticsOverviewData | null;
}

export const StatisticsOverviewView = ({
  data,
}: StatisticsOverviewViewProps) => {
  const t = useTranslate("statistics");

  const cards = data?.cards ?? [];

  const weeklyStudyTime = data?.weeklyStudyTime ?? [];
  const monthlyLessons = data?.monthlyLessons ?? [];
  const attendanceBreakdown = data?.attendanceBreakdown ?? [];
  const subjectDistribution = data?.subjectDistribution ?? [];
  const studyProgress = data?.studyProgress ?? [];
  const heatMap = data?.heatMap ?? [];
  const dailyActivity = data?.dailyActivity ?? [];
  const monthlyGrowth = data?.monthlyGrowth ?? [];

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <StatCardsRow cards={cards} />

      <div className="grid gap-4 lg:grid-cols-2">
        <WeeklyStudyTimeChart data={weeklyStudyTime} />
        <MonthlyLessonsChart data={monthlyLessons} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AttendancePieChart data={attendanceBreakdown} />
        <SubjectDistributionChart data={subjectDistribution} />
      </div>

      <StudyProgressChart data={studyProgress} />

      <HeatMapChart data={heatMap} />

      <div className="grid gap-4 lg:grid-cols-2">
        <DailyActivityChart data={dailyActivity} />
        <MonthlyGrowthChart data={monthlyGrowth} />
      </div>
    </div>
  );
};
