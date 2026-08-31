"use client";

import { useTranslations } from "next-intl";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from "recharts";

import { ChartCard } from "@/components/ui-system/chart-card";
import type { NotificationJobStats } from "@/lib/types/admin";

interface JobStatusChartProps {
  stats: NotificationJobStats;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "var(--muted-foreground)",
  processing: "var(--primary)",
  sent: "var(--success)",
  failed: "var(--destructive)",
  cancelled: "var(--border)",
};

export function JobStatusChart({ stats }: JobStatusChartProps) {
  const t = useTranslations("admin.overview.notificationJobs");

  const chartData = (
    ["pending", "processing", "sent", "failed", "cancelled"] as const
  ).map((status) => ({
    status,
    label: t(status),
    count: stats[status],
  }));

  const total = chartData.reduce((sum, row) => sum + row.count, 0);

  return (
    <ChartCard
      title={t("title")}
      height={220}
      status={total === 0 ? "empty" : "ready"}
    >
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
          >
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
              itemStyle={{ color: "var(--card-foreground)" }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {chartData.map((row) => (
                <Cell key={row.status} fill={STATUS_COLORS[row.status]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
