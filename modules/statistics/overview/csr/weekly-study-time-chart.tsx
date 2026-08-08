"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";

import { ChartCard } from "@/components/ui-system/chart-card";
import useTranslate from "@/hooks/useTranslate";
import type { ChartPoint } from "@/lib/types/statistics";

interface WeeklyStudyTimeChartProps {
  data: ChartPoint[];
}

export function WeeklyStudyTimeChart({ data }: WeeklyStudyTimeChartProps) {
  const t = useTranslate("statistics.charts.weeklyStudyTime");
  const tCommon = useTranslate("common");
  const hasData = data.some((point) => point.value > 0);

  return (
    <ChartCard
      title={t("title")}
      description={t("description")}
      status={hasData ? "ready" : "empty"}
      emptyState={{ title: tCommon("noDataYet"), description: t("empty") }}
      height={220}
    >
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid vertical={false} style={{ stroke: "var(--border)" }} />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              style={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            />
            <Tooltip
              cursor={{ fill: "var(--accent)" }}
              contentStyle={{
                backgroundColor: "var(--card)",
                borderColor: "var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} style={{ fill: "var(--primary)" }} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
