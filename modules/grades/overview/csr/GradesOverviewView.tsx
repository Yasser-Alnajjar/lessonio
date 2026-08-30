"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui-system/empty-state";
import { StatisticCard } from "@/components/ui-system/statistic-card";
import useTranslate from "@/hooks/useTranslate";
import type { GradesOverviewData } from "@/lib/types/grade";
import { GradeTrendChart } from "./grade-trend-chart";

interface GradesOverviewViewProps {
  data: GradesOverviewData;
}

export const GradesOverviewView = ({ data }: GradesOverviewViewProps) => {
  const t = useTranslate("grades.overview");

  const gradedSubjects = data.subjects.filter(
    (subject) => subject.average !== null,
  );

  return (
    <div className="flex flex-col gap-6 p-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatisticCard
          stat={{
            key: "gpa",
            label: t("stats.gpa"),
            value: data.gpa,
            suffix: t("stats.gpaSuffix"),
          }}
        />
        <StatisticCard
          stat={{
            key: "subjectsGraded",
            label: t("stats.subjectsGraded"),
            value: gradedSubjects.length,
          }}
        />
        <StatisticCard
          stat={{
            key: "examsScored",
            label: t("stats.examsScored"),
            value: data.subjects.reduce(
              (sum, subject) => sum + subject.examCount,
              0,
            ),
          }}
        />
      </div>

      <GradeTrendChart data={data.trend} />

      {data.subjects.length === 0 ? (
        <EmptyState
          title={t("emptyTitle")}
          description={t("emptyDescription")}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.subjects.map((subject) => (
            <Card key={subject.subjectId} className="gap-2">
              <CardContent className="flex flex-col gap-2 pt-6">
                <span
                  className="inline-flex items-center gap-1.5 text-sm font-medium"
                  style={{ color: subject.subjectColor }}
                >
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: subject.subjectColor }}
                  />
                  {subject.subjectName}
                </span>

                {subject.average !== null ? (
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-semibold tabular-nums text-foreground">
                      {subject.average}%
                    </span>
                    <Badge variant="secondary">{subject.letter}</Badge>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {t("noScoredExams")}
                  </span>
                )}

                <p className="text-xs text-muted-foreground">
                  {t("cardMeta", {
                    credits: subject.creditHours,
                    exams: subject.examCount,
                  })}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
