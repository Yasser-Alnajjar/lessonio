"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { createDataTableColumnHelper } from "@/components/ui-system/data-table-core";
import type { AdminAssignmentRow } from "@/lib/types/admin";
import { useDateFnsLocale } from "../../components/date-format";

const columnHelper = createDataTableColumnHelper<AdminAssignmentRow>();

export function useAdminAssignmentColumns() {
  const t = useTranslations("admin.assignments.table");
  const tStatus = useTranslations("admin.assignments");
  const dateLocale = useDateFnsLocale();

  return useMemo(
    () => [
      columnHelper.accessor("title", {
        header: t("title"),
        cell: ({ getValue }) => (
          <span className="font-medium text-foreground">{getValue()}</span>
        ),
      }),
      columnHelper.accessor("className", {
        header: t("class"),
        cell: ({ getValue }) => (
          <span className="text-muted-foreground">{getValue()}</span>
        ),
      }),
      columnHelper.accessor("teacherName", {
        header: t("teacher"),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.teacherName ?? "—"}
          </span>
        ),
      }),
      columnHelper.accessor("status", {
        header: t("status"),
        cell: ({ getValue }) => {
          const status = getValue();
          return (
            <Badge variant={status === "published" ? "default" : "secondary"}>
              {status === "published"
                ? tStatus("statusPublished")
                : tStatus("statusDraft")}
            </Badge>
          );
        },
      }),
      columnHelper.accessor("dueAt", {
        header: t("dueAt"),
        cell: ({ getValue }) => {
          const value = getValue();
          return (
            <span className="text-muted-foreground">
              {value
                ? format(new Date(value), "MMM d, yyyy", {
                    locale: dateLocale,
                  })
                : "—"}
            </span>
          );
        },
      }),
    ],
    [t, tStatus, dateLocale],
  );
}
