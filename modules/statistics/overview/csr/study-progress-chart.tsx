"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { ChartCard } from "@/components/ui-system/chart-card";
import useTranslate from "@/hooks/useTranslate";
import type { ChartPoint } from "@/lib/types/statistics";

interface StudyProgressChartProps {
  data: ChartPoint[];
}

export function StudyProgressChart({ data }: StudyProgressChartProps) {
  const t = useTranslate("statistics.charts.studyProgress");
  const tCommon = useTranslate("common");
  const hasData = data.some((point) => point.value > 0);

  return (
    <ChartCard
      title={t("title")}
      description={t("description")}
      status={hasData ? "ready" : "empty"}
      emptyState={{ title: tCommon("noDataYet"), description: t("empty") }}
      height={240}
    >
      <div style={{ height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="studyProgressFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} style={{ stroke: "var(--border)" }} />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              style={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              style={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--card)",
                borderColor: "var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--primary)"
              strokeWidth={2}
              fill="url(#studyProgressFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
