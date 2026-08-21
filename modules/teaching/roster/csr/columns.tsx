"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { useTranslations } from "next-intl";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createDataTableColumnHelper } from "@/components/ui-system/data-table-core";
import type { RosterEntry } from "@/lib/types/enrollment";

function initialsOf(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const initials = parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
  return initials ? initials.toUpperCase() : "?";
}

const columnHelper = createDataTableColumnHelper<RosterEntry>();

/**
 * The roster is the first production consumer of `data-table.tsx` — kept in
 * its own file so the column definitions compile independently of the view
 * that renders them, per the plan's own note that `DataTableRowData` is
 * `Record<string, any>` and a plain interface only satisfies it because the
 * bound is `any`.
 */
export function useRosterColumns() {
  const t = useTranslations("teaching.roster.table");

  return useMemo(
    () => [
      columnHelper.accessor("fullName", {
        header: t("student"),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Avatar size="sm">
              <AvatarImage src={row.original.avatarUrl ?? undefined} alt="" />
              <AvatarFallback>
                {initialsOf(row.original.fullName)}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium text-foreground">
              {row.original.fullName ?? t("unnamedStudent")}
            </span>
          </div>
        ),
      }),
      columnHelper.accessor("joinedAt", {
        header: t("joined"),
        cell: ({ getValue }) => (
          <span className="text-muted-foreground">
            {format(new Date(getValue()), "MMM d, yyyy")}
          </span>
        ),
      }),
    ],
    [t],
  );
}
