"use client";

import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { useTranslations } from "next-intl";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { createDataTableColumnHelper } from "@/components/ui-system/data-table-core";
import type {
  SubmissionQueueEntry,
  SubmissionStatus,
} from "@/lib/types/submission";

function initialsOf(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const initials = parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
  return initials ? initials.toUpperCase() : "?";
}

const STATUS_BADGE_VARIANT: Record<
  SubmissionStatus,
  "outline" | "default" | "secondary"
> = {
  assigned: "outline",
  submitted: "default",
  graded: "secondary",
};

const columnHelper = createDataTableColumnHelper<SubmissionQueueEntry>();

/**
 * The grading queue is the second production consumer of `data-table.tsx` —
 * kept in its own file so the column definitions compile independently of
 * the view that renders them, same reasoning as the roster's `columns.tsx`.
 */
export function useGradingColumns() {
  const t = useTranslations("teaching.grading.table");

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
      columnHelper.accessor("status", {
        header: t("status"),
        cell: ({ getValue }) => (
          <Badge variant={STATUS_BADGE_VARIANT[getValue()]}>
            {t(getValue())}
          </Badge>
        ),
      }),
      columnHelper.accessor((row) => row.submission?.submittedAt ?? null, {
        id: "submittedAt",
        header: t("submittedAtHeader"),
        cell: ({ getValue }) => {
          const submittedAt = getValue();
          return (
            <span className="text-muted-foreground">
              {submittedAt
                ? format(parseISO(submittedAt), "MMM d, yyyy · h:mm a")
                : "—"}
            </span>
          );
        },
      }),
      columnHelper.accessor((row) => row.submission?.score ?? null, {
        id: "score",
        header: t("score"),
        cell: ({ getValue, row }) => {
          const score = getValue();
          return (
            <span className="text-muted-foreground">
              {row.original.status === "graded" && score !== null
                ? t("scoreValue", { score })
                : "—"}
            </span>
          );
        },
      }),
    ],
    [t],
  );
}
