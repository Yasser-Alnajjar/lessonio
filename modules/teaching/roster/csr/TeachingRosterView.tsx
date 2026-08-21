"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { removeStudent } from "@/actions/enrollments.mutations";
import { DataTable } from "@/components/ui-system/data-table";
import type { DataTableRowAction } from "@/components/ui-system/data-table-core";
import { Link, useRouter } from "@/i18n/navigation";
import type { RosterEntry } from "@/lib/types/enrollment";
import type { TeacherClassWithStats } from "@/lib/types/teacher-class";
import { JoinCodePanel } from "../../components/JoinCodePanel";
import { useRosterColumns } from "./columns";

interface TeachingRosterViewProps {
  classItem: TeacherClassWithStats | null;
  roster: RosterEntry[];
}

export const TeachingRosterView = ({
  classItem,
  roster,
}: TeachingRosterViewProps) => {
  const t = useTranslations("teaching.roster");
  const router = useRouter();
  const columns = useRosterColumns();
  const [joinCode, setJoinCode] = useState(classItem?.joinCode ?? "");

  if (!classItem) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <p className="text-sm text-muted-foreground">{t("notFound")}</p>
        <Link
          href="/teaching/classes"
          className="text-sm font-medium text-primary hover:underline"
        >
          {t("backToClasses")}
        </Link>
      </div>
    );
  }

  const rowActions: DataTableRowAction<RosterEntry>[] = [
    {
      label: t("table.remove"),
      variant: "destructive",
      onClick: async (row) => {
        await removeStudent(classItem.id, row.studentId);
        router.refresh();
      },
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-4">
      <div>
        <Link
          href="/teaching/classes"
          className="text-xs font-medium text-muted-foreground hover:underline"
        >
          {t("backToClasses")}
        </Link>
        <h1 className="text-xl font-semibold text-foreground">
          {classItem.name}
        </h1>
        {classItem.subjectLabel && (
          <p className="text-sm text-muted-foreground">
            {classItem.subjectLabel}
          </p>
        )}
      </div>

      <JoinCodePanel
        classId={classItem.id}
        code={joinCode}
        onRotated={setJoinCode}
      />

      <DataTable
        columns={columns}
        data={roster}
        getRowId={(row) => row.studentId}
        rowActions={rowActions}
        emptyState={{
          variant: "no-data",
          title: t("emptyTitle"),
          description: t("emptyDescription"),
        }}
      />
    </div>
  );
};
