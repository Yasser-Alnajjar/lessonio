"use client";

import { useState } from "react";
import { format } from "date-fns";
import { useTranslations } from "next-intl";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import type { AdminUserDetail } from "@/lib/types/admin";
import { AdminNav } from "../../components/AdminNav";
import { ChangeRoleDialog } from "../../components/ChangeRoleDialog";
import { useDateFnsLocale } from "../../components/date-format";

interface AdminUserDetailViewProps {
  data: AdminUserDetail | null;
  currentUserId: string | null;
}

function initialsOf(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (
    parts
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "?"
  );
}

export function AdminUserDetailView({
  data,
  currentUserId,
}: AdminUserDetailViewProps) {
  const t = useTranslations("admin.users.detail");
  const dateLocale = useDateFnsLocale();
  const tUsers = useTranslations("admin.users");
  const tRoles = useTranslations("admin.roles");
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);

  if (!data) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <AdminNav />
        <p className="text-sm text-muted-foreground">{t("notFound")}</p>
        <Link
          href="/admin/users"
          className="text-sm font-medium text-primary hover:underline"
        >
          {t("backToUsers")}
        </Link>
      </div>
    );
  }

  const counts = [
    { key: "lessons", label: t("counts.lessons"), value: data.counts.lessons },
    {
      key: "subjects",
      label: t("counts.subjects"),
      value: data.counts.subjects,
    },
    {
      key: "studySessions",
      label: t("counts.studySessions"),
      value: data.counts.studySessions,
    },
    {
      key: "teacherClasses",
      label: t("counts.teacherClasses"),
      value: data.counts.teacherClasses,
    },
    {
      key: "assignments",
      label: t("counts.assignments"),
      value: data.counts.assignments,
    },
  ];

  const isSelf = data.id === currentUserId;

  return (
    <div className="flex flex-col gap-6 p-4">
      <AdminNav />

      <div>
        <Link
          href="/admin/users"
          className="text-xs font-medium text-muted-foreground hover:underline"
        >
          {t("backToUsers")}
        </Link>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
          <div className="flex items-center gap-3">
            <Avatar size="lg">
              <AvatarImage src={data.avatarUrl ?? undefined} alt="" />
              <AvatarFallback>{initialsOf(data.fullName)}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl font-semibold text-foreground">
                {data.fullName ?? data.email}
              </h1>
              <p className="text-sm text-muted-foreground">{data.email}</p>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                {data.role && <Badge>{tRoles(data.role)}</Badge>}
                <span>
                  {t("memberSince")}{" "}
                  {format(new Date(data.createdAt), "MMM d, yyyy", {
                    locale: dateLocale,
                  })}
                </span>
                {data.timezone && (
                  <span>
                    {t("timezone")}: {data.timezone}
                  </span>
                )}
              </div>
            </div>
          </div>

          {!isSelf && (
            <Button onClick={() => setRoleDialogOpen(true)}>
              {tUsers("table.changeRole")}
            </Button>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">
          {t("counts.title")}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {counts.map((count) => (
            <Card key={count.key}>
              <CardContent className="flex flex-col gap-1 pt-6">
                <span className="text-xs text-muted-foreground">
                  {count.label}
                </span>
                <span className="text-2xl font-semibold tabular-nums text-foreground">
                  {count.value}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {!isSelf && (
        <ChangeRoleDialog
          open={roleDialogOpen}
          onOpenChange={setRoleDialogOpen}
          user={data}
        />
      )}
    </div>
  );
}
