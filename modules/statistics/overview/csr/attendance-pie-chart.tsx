"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { ChartCard } from "@/components/ui-system/chart-card";
import useTranslate from "@/hooks/useTranslate";
import type { ChartPoint } from "@/lib/types/statistics";

const STATUS_COLORS = [
  "var(--success)",
  "var(--destructive)",
  "var(--highlighter)",
  "var(--chart-5)",
];

interface AttendancePieChartProps {
  data: ChartPoint[];
}

export function AttendancePieChart({ data }: AttendancePieChartProps) {
  const t = useTranslate("statistics.charts.attendanceBreakdown");
  const tCommon = useTranslate("common");
  const withColors = data.map((point, index) => ({
    ...point,
    fill: STATUS_COLORS[index % STATUS_COLORS.length],
  }));
  const chartData = withColors.filter((point) => point.value > 0);
  const hasData = chartData.length > 0;

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
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="label"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
            >
              {chartData.map((point) => (
                <Cell key={point.label} fill={point.fill} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--card)",
                borderColor: "var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
