import { MinusIcon, TrendingDownIcon, TrendingUpIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { StatCard } from "@/lib/types/statistics";

export interface StatisticTrend {
  value: number;
  label?: string;
}

export interface StatisticCardProps extends React.ComponentProps<"div"> {
  stat: Omit<StatCard, "value"> & { value: number | null };
  icon?: React.ReactNode;
  trend?: StatisticTrend;
}

export function StatisticCard({
  stat,
  icon,
  trend,
  className,
  ...props
}: StatisticCardProps) {
  const hasValue = stat.value !== null && !Number.isNaN(stat.value);

  return (
    <Card
      data-slot="statistic-card"
      className={cn("gap-2", className)}
      {...props}
    >
      <CardContent className="flex items-start justify-between gap-3 pt-6">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">{stat.label}</span>
          {hasValue ? (
            <span className="text-2xl font-semibold tabular-nums text-foreground">
              {stat.value}
              {stat.suffix && (
                <span className="ms-0.5 text-base font-normal text-muted-foreground">
                  {stat.suffix}
                </span>
              )}
            </span>
          ) : (
            <span className="text-2xl font-semibold text-muted-foreground/40">
              —
            </span>
          )}
          {hasValue && trend && <TrendIndicator trend={trend} />}
          {!hasValue && (
            <span className="text-xs text-muted-foreground">No data yet</span>
          )}
        </div>
        {icon && (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            {icon}
          </span>
        )}
      </CardContent>
    </Card>
  );
}

function TrendIndicator({ trend }: { trend: StatisticTrend }) {
  const Icon =
    trend.value > 0
      ? TrendingUpIcon
      : trend.value < 0
        ? TrendingDownIcon
        : MinusIcon;
  const tone =
    trend.value > 0
      ? "text-success"
      : trend.value < 0
        ? "text-destructive"
        : "text-muted-foreground";

  return (
    <span
      className={cn("inline-flex items-center gap-1 text-xs font-medium", tone)}
    >
      <Icon className="size-3.5" />
      {trend.value > 0 ? "+" : ""}
      {trend.value}%
      {trend.label && (
        <span className="text-muted-foreground">{trend.label}</span>
      )}
    </span>
  );
}

export function StatisticCardSkeleton({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <Card
      data-slot="statistic-card-skeleton"
      className={cn("gap-2", className)}
      {...props}
    >
      <CardContent className="flex items-start justify-between gap-3 pt-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-7 w-12" />
        </div>
        <Skeleton className="size-9 shrink-0 rounded-lg" />
      </CardContent>
    </Card>
  );
}
