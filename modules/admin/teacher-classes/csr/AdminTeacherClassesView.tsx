"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { setClassArchived } from "@/actions/admin.mutations";
import { ConfirmDialog } from "@/components/ui-system/confirm-dialog";
import { DataTable } from "@/components/ui-system/data-table";
import type { DataTableRowAction } from "@/components/ui-system/data-table-core";
import { SearchInput } from "@/components/ui-system/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQueryParams } from "@/hooks/useQueryParams";
import { useRouter } from "@/i18n/navigation";
import type { AdminClassRow } from "@/lib/types/admin";
import type { PaginationMeta } from "@/lib/types/common";
import { AdminNav } from "../../components/AdminNav";
import { useAdminPagination } from "../../components/AdminPagination";
import { useAdminClassColumns } from "./columns";

interface AdminTeacherClassesViewProps {
  data: AdminClassRow[];
  meta: PaginationMeta;
  filters: { q: string; archived: string };
}

const ARCHIVED_FILTER_VALUES = ["all", "active", "archived"] as const;

export function AdminTeacherClassesView({
  data,
  meta,
  filters,
}: AdminTeacherClassesViewProps) {
  const t = useTranslations("admin.classes");
  const router = useRouter();
  const { createQueryFromObject } = useQueryParams();
  const [, startTransition] = useTransition();
  const columns = useAdminClassColumns();
  const serverPagination = useAdminPagination(meta);
  const [archiveTarget, setArchiveTarget] = useState<{
    row: AdminClassRow;
    nextArchived: boolean;
  } | null>(null);

  const rowActions: DataTableRowAction<AdminClassRow>[] = [
    {
      label: t("table.archive"),
      isHidden: (row) => row.isArchived,
      onClick: (row) => setArchiveTarget({ row, nextArchived: true }),
    },
    {
      label: t("table.unarchive"),
      isHidden: (row) => !row.isArchived,
      onClick: (row) => setArchiveTarget({ row, nextArchived: false }),
    },
  ];

  const archivedFilterValue =
    filters.archived === "true"
      ? "archived"
      : filters.archived === "false"
        ? "active"
        : "all";

  return (
    <div className="flex flex-col gap-6 p-4">
      <AdminNav />

      <div>
        <h1 className="text-xl font-semibold text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          defaultValue={filters.q}
          onSearch={(value) =>
            startTransition(() =>
              createQueryFromObject({ q: value || undefined, page: 1 }),
            )
          }
          placeholder={t("searchPlaceholder")}
          containerClassName="w-full sm:w-72"
        />
        <Select
          value={archivedFilterValue}
          onValueChange={(value) =>
            startTransition(() =>
              createQueryFromObject({
                archived:
                  value === "all"
                    ? undefined
                    : value === "archived"
                      ? "true"
                      : "false",
                page: 1,
              }),
            )
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ARCHIVED_FILTER_VALUES.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`archivedFilter.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={data}
        getRowId={(row) => row.id}
        rowActions={rowActions}
        serverPagination={serverPagination}
        emptyState={{
          variant: "no-data",
          title: t("emptyTitle"),
          description: t("emptyDescription"),
        }}
      />

      {archiveTarget && (
        <ConfirmDialog
          open={Boolean(archiveTarget)}
          onOpenChange={(open) => {
            if (!open) setArchiveTarget(null);
          }}
          title={
            archiveTarget.nextArchived
              ? t("archiveDialog.title")
              : t("unarchiveDialog.title")
          }
          description={
            archiveTarget.nextArchived
              ? t("archiveDialog.description", {
                  name: archiveTarget.row.name,
                })
              : t("unarchiveDialog.description", {
                  name: archiveTarget.row.name,
                })
          }
          confirmLabel={
            archiveTarget.nextArchived
              ? t("archiveDialog.confirm")
              : t("unarchiveDialog.confirm")
          }
          variant={archiveTarget.nextArchived ? "destructive" : "default"}
          onConfirm={async () => {
            const result = await setClassArchived(
              archiveTarget.row.id,
              archiveTarget.nextArchived,
            );
            if (!result.success) {
              throw new Error(result.error ?? undefined);
            }
            setArchiveTarget(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
