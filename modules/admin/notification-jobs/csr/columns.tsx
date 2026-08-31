"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { createDataTableColumnHelper } from "@/components/ui-system/data-table-core";
import type {
  NotificationJobRow,
  NotificationJobStatus,
} from "@/lib/types/admin";
import { useDateFnsLocale } from "../../components/date-format";

const columnHelper = createDataTableColumnHelper<NotificationJobRow>();

const STATUS_BADGE_VARIANT: Record<
  NotificationJobStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  pending: "outline",
  processing: "secondary",
  sent: "default",
  failed: "destructive",
  cancelled: "secondary",
};

export function useAdminNotificationJobColumns() {
  const t = useTranslations("admin.jobs.table");
  const tStats = useTranslations("admin.jobs.stats");
  const dateLocale = useDateFnsLocale();

  return useMemo(
    () => [
      columnHelper.accessor("eventType", {
        header: t("eventType"),
        cell: ({ getValue }) => (
          <span className="font-medium text-foreground">{getValue()}</span>
        ),
      }),
      columnHelper.accessor("recipientEmail", {
        header: t("recipient"),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.recipientEmail ?? row.original.recipientId}
          </span>
        ),
      }),
      columnHelper.accessor("status", {
        header: t("status"),
        cell: ({ getValue }) => {
          const status = getValue();
          return (
            <Badge variant={STATUS_BADGE_VARIANT[status]}>
              {tStats(status)}
            </Badge>
          );
        },
      }),
      columnHelper.accessor("scheduledAt", {
        header: t("scheduledAt"),
        cell: ({ getValue }) => (
          <span className="text-muted-foreground">
            {format(new Date(getValue()), "MMM d, yyyy p", {
              locale: dateLocale,
            })}
          </span>
        ),
      }),
      columnHelper.accessor("attempts", {
        header: t("attempts"),
        cell: ({ getValue }) => (
          <span className="tabular-nums text-muted-foreground">
            {getValue()}
          </span>
        ),
      }),
    ],
    [t, tStats, dateLocale],
  );
}
