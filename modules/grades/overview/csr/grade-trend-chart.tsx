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

interface GradeTrendChartProps {
  data: ChartPoint[];
}

export function GradeTrendChart({ data }: GradeTrendChartProps) {
  const t = useTranslate("grades.overview.trendChart");
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
              domain={[0, 100]}
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
              itemStyle={{
                color: "var(--card-foreground)",
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="var(--primary)"
              strokeWidth={2}
              dot={{ r: 3, fill: "var(--primary)" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
