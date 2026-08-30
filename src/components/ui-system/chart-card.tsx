import { AlertTriangleIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  EmptyState,
  type EmptyStateProps,
} from "@/components/ui-system/empty-state";

export interface ChartCardProps extends React.ComponentProps<"div"> {
  title: string;
  description?: string;
  /** Legend, time-range selector, or other header-trailing controls. */
  action?: React.ReactNode;
  status?: "ready" | "loading" | "empty" | "error";
  emptyState?: Pick<EmptyStateProps, "title" | "description" | "action">;
  errorMessage?: string;
  onRetry?: () => void;
  height?: number;
  children?: React.ReactNode;
}

export function ChartCard({
  title,
  description,
  action,
  status = "ready",
  emptyState,
  errorMessage = "Something went wrong loading this chart.",
  onRetry,
  height = 240,
  children,
  className,
  ...props
}: ChartCardProps) {
  return (
    <Card
      data-slot="chart-card"
      data-status={status}
      className={cn("gap-4", className)}
      {...props}
    >
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-base font-medium">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {action && status === "ready" && (
          <div className="shrink-0">{action}</div>
        )}
      </CardHeader>
      <CardContent style={{ minHeight: height }}>
        {status === "loading" && (
          <Skeleton className="h-full w-full" style={{ height }} />
        )}

        {status === "empty" && (
          <EmptyState
            variant="no-data"
            title={emptyState?.title ?? "No data yet"}
            description={emptyState?.description}
            action={emptyState?.action}
            className="min-h-0 border-none p-0"
            style={{ height }}
          />
        )}

        {status === "error" && (
          <div
            className="flex flex-col items-center justify-center gap-2 text-center"
            style={{ height }}
          >
            <AlertTriangleIcon className="size-6 text-destructive" />
            <p className="max-w-xs text-sm text-muted-foreground">
              {errorMessage}
            </p>
            {onRetry && (
              <Button size="sm" variant="outline" onClick={onRetry}>
                Retry
              </Button>
            )}
          </div>
        )}

        {status === "ready" && children}
      </CardContent>
    </Card>
  );
}
