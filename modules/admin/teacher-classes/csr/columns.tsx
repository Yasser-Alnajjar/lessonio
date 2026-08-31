"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { createDataTableColumnHelper } from "@/components/ui-system/data-table-core";
import type { AdminClassRow } from "@/lib/types/admin";

const columnHelper = createDataTableColumnHelper<AdminClassRow>();

export function useAdminClassColumns() {
  const t = useTranslations("admin.classes.table");
  const tStatus = useTranslations("admin.classes");

  return useMemo(
    () => [
      columnHelper.accessor("name", {
        header: t("name"),
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium text-foreground">
              {row.original.name}
            </span>
            {row.original.subjectLabel && (
              <span className="text-xs text-muted-foreground">
                {row.original.subjectLabel}
              </span>
            )}
          </div>
        ),
      }),
      columnHelper.accessor("teacherName", {
        header: t("teacher"),
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="text-foreground">
              {row.original.teacherName ?? row.original.teacherEmail}
            </span>
            <span className="text-xs text-muted-foreground">
              {row.original.teacherEmail}
            </span>
          </div>
        ),
      }),
      columnHelper.accessor("studentCount", {
        header: t("students"),
        cell: ({ getValue }) => (
          <span className="tabular-nums text-muted-foreground">
            {getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("isArchived", {
        header: t("status"),
        cell: ({ getValue }) => (
          <Badge variant={getValue() ? "secondary" : "default"}>
            {getValue() ? tStatus("statusArchived") : tStatus("statusActive")}
          </Badge>
        ),
      }),
    ],
    [t, tStatus],
  );
}
