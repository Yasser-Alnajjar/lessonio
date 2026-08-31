"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";

import { DataTable } from "@/components/ui-system/data-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQueryParams } from "@/hooks/useQueryParams";
import {
  NOTIFICATION_EVENT_TYPES,
  NOTIFICATION_JOB_STATUSES,
  type NotificationJobRow,
  type NotificationJobStats,
} from "@/lib/types/admin";
import type { PaginationMeta } from "@/lib/types/common";
import { AdminNav } from "../../components/AdminNav";
import { useAdminPagination } from "../../components/AdminPagination";
import { useAdminNotificationJobColumns } from "./columns";

interface AdminNotificationJobsViewProps {
  data: NotificationJobRow[];
  meta: PaginationMeta;
  stats: NotificationJobStats | null;
  filters: { status: string; eventType: string };
}

const ALL_VALUE = "all";

export function AdminNotificationJobsView({
  data,
  meta,
  stats,
  filters,
}: AdminNotificationJobsViewProps) {
  const t = useTranslations("admin.jobs");
  const tStats = useTranslations("admin.jobs.stats");
  const { createQueryFromObject } = useQueryParams();
  const [, startTransition] = useTransition();
  const columns = useAdminNotificationJobColumns();
  const serverPagination = useAdminPagination(meta);

  return (
    <div className="flex flex-col gap-6 p-4">
      <AdminNav />

      <div>
        <h1 className="text-xl font-semibold text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {(
            ["pending", "processing", "sent", "failed", "cancelled"] as const
          ).map((status) => (
            <div
              key={status}
              className="flex flex-col gap-1 rounded-lg border p-3"
            >
              <span className="text-xs text-muted-foreground">
                {tStats(status)}
              </span>
              <span className="text-xl font-semibold tabular-nums text-foreground">
                {stats[status]}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={filters.status || ALL_VALUE}
          onValueChange={(value) =>
            startTransition(() =>
              createQueryFromObject({
                status: value === ALL_VALUE ? undefined : value,
                page: 1,
              }),
            )
          }
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>{t("statusFilterAll")}</SelectItem>
            {NOTIFICATION_JOB_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {tStats(status)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.eventType || ALL_VALUE}
          onValueChange={(value) =>
            startTransition(() =>
              createQueryFromObject({
                eventType: value === ALL_VALUE ? undefined : value,
                page: 1,
              }),
            )
          }
        >
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>
              {t("eventTypeFilterAll")}
            </SelectItem>
            {NOTIFICATION_EVENT_TYPES.map((eventType) => (
              <SelectItem key={eventType} value={eventType}>
                {eventType}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={data}
        getRowId={(row) => row.id}
        serverPagination={serverPagination}
        emptyState={{
          variant: "no-data",
          title: t("emptyTitle"),
          description: t("emptyDescription"),
        }}
      />
    </div>
  );
}
