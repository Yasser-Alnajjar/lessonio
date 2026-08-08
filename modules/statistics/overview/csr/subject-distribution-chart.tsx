"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { ChartCard } from "@/components/ui-system/chart-card";
import useTranslate from "@/hooks/useTranslate";
import type { SubjectDistributionPoint } from "@/lib/types/statistics";

interface SubjectDistributionChartProps {
  data: SubjectDistributionPoint[];
}

export function SubjectDistributionChart({ data }: SubjectDistributionChartProps) {
  const t = useTranslate("statistics.charts.subjectDistribution");
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
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="subjectName"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
            >
              {data.map((point) => (
                <Cell key={point.subjectName} fill={point.subjectColor} />
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
