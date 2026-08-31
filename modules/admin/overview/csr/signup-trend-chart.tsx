"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";

import { ChartCard } from "@/components/ui-system/chart-card";
import type { AdminOverview } from "@/lib/types/admin";

interface SignupTrendChartProps {
  signupTrend: AdminOverview["signupTrend"];
}

export function SignupTrendChart({ signupTrend }: SignupTrendChartProps) {
  const t = useTranslations("admin.overview.signupTrend");
  const locale = useLocale();

  const chartData = signupTrend.map((point) => ({
    label: new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
    }).format(new Date(point.date)),
    count: point.count,
  }));

  return (
    <ChartCard
      title={t("title")}
      height={220}
      status={signupTrend.length === 0 ? "empty" : "ready"}
    >
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
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
              cursor={{ stroke: "var(--border)" }}
              contentStyle={{
                backgroundColor: "var(--card)",
                borderColor: "var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              itemStyle={{ color: "var(--card-foreground)" }}
            />
            <Area
              type="monotone"
              dataKey="count"
              fillOpacity={0.15}
              style={{ stroke: "var(--primary)", fill: "var(--primary)" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
