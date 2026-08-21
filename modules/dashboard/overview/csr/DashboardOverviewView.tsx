"use client";

import type { DashboardOverviewData } from "@/lib/types/dashboard";
import { GreetingCard } from "./greeting-card";
import { StreakCard } from "./streak-card";
import { ProgressCard } from "./progress-card";
import { ClassListCard } from "./class-list-card";
import { RecentActivityCard } from "./recent-activity-card";
import { WeeklySummaryCard } from "./weekly-summary-card";
import { QuickActionsCard } from "./quick-actions-card";
import { AssignedWorkCard } from "./assigned-work-card";
import useTranslate from "@/hooks/useTranslate";

interface DashboardOverviewViewProps {
  data: DashboardOverviewData | null;
}

export const DashboardOverviewView = ({ data }: DashboardOverviewViewProps) => {
  const t = useTranslate("dashboard");

  const greetingName = data?.greetingName ?? "there";
  const progress = data?.progress ?? {
    xp: 0,
    level: 1,
    xpToNextLevel: 100,
    currentStreakDays: 0,
    longestStreakDays: 0,
  };
  const overallProgressPercent = data?.overallProgressPercent ?? 0;
  const todayClasses = data?.todayClasses ?? [];
  const upcomingClasses = data?.upcomingClasses ?? [];
  const recentActivity = data?.recentActivity ?? [];
  const weeklySummary = data?.weeklySummary ?? {
    totalMinutes: 0,
    targetMinutes: 0,
    dayBreakdown: [],
  };
  const assignedWork = data?.assignedWork ?? [];

  return (
    <div className="flex flex-col gap-6 p-4">
      <GreetingCard name={greetingName} />

      <div className="grid gap-4 sm:grid-cols-2">
        <StreakCard
          currentStreakDays={progress.currentStreakDays}
          longestStreakDays={progress.longestStreakDays}
        />
        <ProgressCard
          percent={overallProgressPercent}
          level={progress.level}
          xp={progress.xp}
          xpToNextLevel={progress.xpToNextLevel}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ClassListCard
          title={t("todayClasses.title")}
          classes={todayClasses}
          emptyMessage={t("todayClasses.empty")}
        />
        <ClassListCard
          title={t("upcomingClasses.title")}
          classes={upcomingClasses}
          emptyMessage={t("upcomingClasses.empty")}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <WeeklySummaryCard summary={weeklySummary} />
        <RecentActivityCard items={recentActivity} />
      </div>

      <QuickActionsCard />

      {assignedWork.length > 0 && (
        <AssignedWorkCard
          title={t("assignedWork.title")}
          overdueLabel={t("assignedWork.overdue")}
          assignments={assignedWork}
        />
      )}
    </div>
  );
};
