"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartCard } from "@/components/ui-system/chart-card";
import useTranslate from "@/hooks/useTranslate";
import type { ChartPoint } from "@/lib/types/statistics";

interface MonthlyGrowthChartProps {
  data: ChartPoint[];
}

export function MonthlyGrowthChart({ data }: MonthlyGrowthChartProps) {
  const t = useTranslate("statistics.charts.monthlyGrowth");
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
          <LineChart
            data={data}
            margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
          >
            <CartesianGrid
              vertical={false}
              style={{ stroke: "var(--border)" }}
            />
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
            <Line
              type="monotone"
              dataKey="value"
              stroke="var(--chart-3)"
              strokeWidth={2}
              dot={{ r: 3, fill: "var(--chart-3)" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
