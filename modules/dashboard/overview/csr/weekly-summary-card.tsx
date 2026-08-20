"use client";

import { useLocale } from "next-intl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";

import { ChartCard } from "@/components/ui-system/chart-card";
import useTranslate from "@/hooks/useTranslate";
import type { WeeklyStudySummary } from "@/lib/types/dashboard";

interface WeeklySummaryCardProps {
  summary: WeeklyStudySummary;
}

export function WeeklySummaryCard({ summary }: WeeklySummaryCardProps) {
  const t = useTranslate("dashboard.weeklySummary");
  const locale = useLocale();

  const chartData = summary.dayBreakdown.map((day) => ({
    label: new Intl.DateTimeFormat(locale, { weekday: "short" }).format(
      new Date(day.date),
    ),
    minutes: day.minutes,
  }));

  const description =
    summary.targetMinutes > 0
      ? t("subtitle", {
          minutes: summary.totalMinutes,
          target: summary.targetMinutes,
        })
      : t("noGoal", { minutes: summary.totalMinutes });

  return (
    <ChartCard title={t("title")} description={description} height={200}>
      <div style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
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
            <Tooltip
              cursor={{ fill: "var(--muted)", opacity: 0.35 }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;

                return (
                  <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
                    <p className="mb-1 font-medium">{label}</p>
                    <p className="text-muted-foreground">
                      {t("minutes", { minutes: `${payload[0]?.value}` })}
                    </p>
                  </div>
                );
              }}
            />
            <Bar
              dataKey="minutes"
              radius={[4, 4, 0, 0]}
              style={{ fill: "var(--primary)" }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
