"use client";

import { StatisticCard } from "@/components/ui-system/statistic-card";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import useTranslate from "@/hooks/useTranslate";
import type { LessonWithRelations } from "@/lib/types/lesson";
import type { StudySessionSummary, StudySessionWithRelations } from "@/lib/types/study-session";
import type { Subject } from "@/lib/types/subject";
import { FocusTimer } from "../../components/FocusTimer";

interface StudySessionsFocusViewProps {
  running: StudySessionWithRelations | null;
  subjects: Subject[];
  lessons: LessonWithRelations[];
  summary: StudySessionSummary | null;
}

export const StudySessionsFocusView = ({
  running,
  subjects,
  lessons,
  summary,
}: StudySessionsFocusViewProps) => {
  const t = useTranslate("studySessions.focus");

  const safeSummary = summary ?? {
    totalMinutesThisWeek: 0,
    totalMinutesToday: 0,
    averageSessionMinutes: 0,
    sessionsThisWeek: 0,
  };

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/study-sessions/history">{t("viewHistory")}</Link>
        </Button>
      </div>

      <div className="mx-auto w-full max-w-md">
        <FocusTimer running={running} subjects={subjects} lessons={lessons} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatisticCard
          stat={{ key: "today", label: t("stats.today"), value: safeSummary.totalMinutesToday, suffix: "m" }}
        />
        <StatisticCard
          stat={{ key: "week", label: t("stats.week"), value: safeSummary.totalMinutesThisWeek, suffix: "m" }}
        />
        <StatisticCard
          stat={{ key: "sessions", label: t("stats.sessions"), value: safeSummary.sessionsThisWeek }}
        />
        <StatisticCard
          stat={{ key: "average", label: t("stats.average"), value: safeSummary.averageSessionMinutes, suffix: "m" }}
        />
      </div>
    </div>
  );
};
