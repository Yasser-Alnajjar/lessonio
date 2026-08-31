"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { useTranslations } from "next-intl";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { createDataTableColumnHelper } from "@/components/ui-system/data-table-core";
import { Link } from "@/i18n/navigation";
import type { AdminUserRow } from "@/lib/types/admin";
import { useDateFnsLocale } from "../../components/date-format";

function initialsOf(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const initials = parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
  return initials ? initials.toUpperCase() : "?";
}

const ROLE_BADGE_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  admin: "default",
  teacher: "secondary",
  student: "outline",
};

const columnHelper = createDataTableColumnHelper<AdminUserRow>();

export function useAdminUserColumns() {
  const t = useTranslations("admin.users.table");
  const tRoles = useTranslations("admin.roles");
  const dateLocale = useDateFnsLocale();

  return useMemo(
    () => [
      columnHelper.accessor("fullName", {
        header: t("name"),
        cell: ({ row }) => (
          <Link
            href={`/admin/users/${row.original.id}`}
            className="flex items-center gap-2 hover:underline"
          >
            <Avatar size="sm">
              <AvatarImage src={row.original.avatarUrl ?? undefined} alt="" />
              <AvatarFallback>
                {initialsOf(row.original.fullName)}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium text-foreground">
              {row.original.fullName ?? row.original.email}
            </span>
          </Link>
        ),
      }),
      columnHelper.accessor("email", {
        header: t("email"),
        cell: ({ getValue }) => (
          <span className="text-muted-foreground">{getValue()}</span>
        ),
      }),
      columnHelper.accessor("role", {
        header: t("role"),
        cell: ({ getValue }) => {
          const role = getValue();
          return role ? (
            <Badge variant={ROLE_BADGE_VARIANT[role]}>{tRoles(role)}</Badge>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
      }),
      columnHelper.accessor("createdAt", {
        header: t("joined"),
        cell: ({ getValue }) => (
          <span className="text-muted-foreground">
            {format(new Date(getValue()), "MMM d, yyyy", {
              locale: dateLocale,
            })}
          </span>
        ),
      }),
    ],
    [t, tRoles, dateLocale],
  );
}
