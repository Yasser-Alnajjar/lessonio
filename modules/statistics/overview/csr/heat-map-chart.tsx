"use client";

import { useMemo } from "react";

import { ChartCard } from "@/components/ui-system/chart-card";
import useTranslate from "@/hooks/useTranslate";
import { cn } from "@/lib/utils";
import type { HeatMapCell } from "@/lib/types/statistics";

const INTENSITY_CLASSES = [
  "bg-accent",
  "bg-primary/25",
  "bg-primary/50",
  "bg-primary/75",
  "bg-primary",
];

interface HeatMapChartProps {
  data: HeatMapCell[];
}

export function HeatMapChart({ data }: HeatMapChartProps) {
  const t = useTranslate("statistics.charts.heatMap");
  const tCommon = useTranslate("common");
  const hasData = data.some((cell) => cell.intensity > 0);

  const weeks = useMemo(() => {
    const result: Array<Array<HeatMapCell | null>> = [];
    for (let i = 0; i < data.length; i += 7) {
      const week: Array<HeatMapCell | null> = data.slice(i, i + 7);
      while (week.length < 7) week.push(null);
      result.push(week);
    }
    return result;
  }, [data]);

  return (
    <ChartCard
      title={t("title")}
      description={t("description")}
      status={hasData ? "ready" : "empty"}
      emptyState={{ title: tCommon("noDataYet"), description: t("empty") }}
      height={180}
    >
      <div className="flex h-full items-center gap-1 overflow-x-auto py-2" style={{ height: 180 }}>
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="flex flex-col gap-1">
            {week.map((cell, dayIndex) =>
              cell ? (
                <div
                  key={cell.date}
                  title={cell.date}
                  className={cn(
                    "size-3.5 rounded-sm",
                    INTENSITY_CLASSES[cell.intensity] ?? INTENSITY_CLASSES[0],
                  )}
                />
              ) : (
                <div key={dayIndex} className="size-3.5 rounded-sm bg-transparent" />
              ),
            )}
          </div>
        ))}
      </div>
    </ChartCard>
  );
}
