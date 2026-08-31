"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

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
import type { AdminUserRow } from "@/lib/types/admin";
import type { PaginationMeta } from "@/lib/types/common";
import { APP_ROLES } from "@/lib/types/user";
import { AdminNav } from "../../components/AdminNav";
import { ChangeRoleDialog } from "../../components/ChangeRoleDialog";
import { useAdminPagination } from "../../components/AdminPagination";
import { useAdminUserColumns } from "./columns";

interface AdminUsersViewProps {
  data: AdminUserRow[];
  meta: PaginationMeta;
  currentUserId: string | null;
  filters: { q: string; role: string };
}

const ALL_ROLES_VALUE = "all";

export function AdminUsersView({
  data,
  meta,
  currentUserId,
  filters,
}: AdminUsersViewProps) {
  const t = useTranslations("admin.users");
  const tRoles = useTranslations("admin.roles");
  const { createQueryFromObject } = useQueryParams();
  const [, startTransition] = useTransition();
  const columns = useAdminUserColumns();
  const serverPagination = useAdminPagination(meta);
  const [roleTarget, setRoleTarget] = useState<AdminUserRow | null>(null);

  const rowActions: DataTableRowAction<AdminUserRow>[] = [
    {
      label: t("table.changeRole"),
      onClick: (row) => setRoleTarget(row),
      isHidden: (row) => row.id === currentUserId,
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
          value={filters.role || ALL_ROLES_VALUE}
          onValueChange={(value) =>
            startTransition(() =>
              createQueryFromObject({
                role: value === ALL_ROLES_VALUE ? undefined : value,
                page: 1,
              }),
            )
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_ROLES_VALUE}>
              {t("roleFilterAll")}
            </SelectItem>
            {APP_ROLES.map((role) => (
              <SelectItem key={role} value={role}>
                {tRoles(role)}
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

      {roleTarget && (
        <ChangeRoleDialog
          // Forces a remount per target user — RHF's `defaultValues` only
          // apply once at mount, and this dialog's `open` prop doesn't
          // necessarily go false→true between two different rows' clicks,
          // so without a per-user key the form could show a stale role.
          key={roleTarget.id}
          open={Boolean(roleTarget)}
          onOpenChange={(open) => {
            if (!open) setRoleTarget(null);
          }}
          user={roleTarget}
        />
      )}
    </div>
  );
}
