"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { unpublishAssignment } from "@/actions/admin.mutations";
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
import type {
  AdminAssignmentRow,
  AdminAssignmentStatus,
} from "@/lib/types/admin";
import type { PaginationMeta } from "@/lib/types/common";
import { AdminNav } from "../../components/AdminNav";
import { useAdminPagination } from "../../components/AdminPagination";
import { useAdminAssignmentColumns } from "./columns";

interface AdminAssignmentsViewProps {
  data: AdminAssignmentRow[];
  meta: PaginationMeta;
  filters: { q: string; status: string };
}

const STATUS_VALUES: readonly AdminAssignmentStatus[] = [
  "draft",
  "published",
];
const ALL_STATUSES_VALUE = "all";

export function AdminAssignmentsView({
  data,
  meta,
  filters,
}: AdminAssignmentsViewProps) {
  const t = useTranslations("admin.assignments");
  const router = useRouter();
  const { createQueryFromObject } = useQueryParams();
  const [, startTransition] = useTransition();
  const columns = useAdminAssignmentColumns();
  const serverPagination = useAdminPagination(meta);
  const [unpublishTarget, setUnpublishTarget] =
    useState<AdminAssignmentRow | null>(null);

  const rowActions: DataTableRowAction<AdminAssignmentRow>[] = [
    {
      label: t("table.unpublish"),
      isHidden: (row) => row.status !== "published",
      onClick: (row) => setUnpublishTarget(row),
    },
  ];

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
          value={filters.status || ALL_STATUSES_VALUE}
          onValueChange={(value) =>
            startTransition(() =>
              createQueryFromObject({
                status: value === ALL_STATUSES_VALUE ? undefined : value,
                page: 1,
              }),
            )
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STATUSES_VALUE}>
              {t("statusFilterAll")}
            </SelectItem>
            {STATUS_VALUES.map((status) => (
              <SelectItem key={status} value={status}>
                {status === "published"
                  ? t("statusPublished")
                  : t("statusDraft")}
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

      {unpublishTarget && (
        <ConfirmDialog
          open={Boolean(unpublishTarget)}
          onOpenChange={(open) => {
            if (!open) setUnpublishTarget(null);
          }}
          title={t("unpublishDialog.title")}
          description={t("unpublishDialog.description", {
            title: unpublishTarget.title,
          })}
          confirmLabel={t("unpublishDialog.confirm")}
          variant="destructive"
          onConfirm={async () => {
            const result = await unpublishAssignment(unpublishTarget.id);
            if (!result.success) {
              throw new Error(result.error ?? undefined);
            }
            setUnpublishTarget(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
