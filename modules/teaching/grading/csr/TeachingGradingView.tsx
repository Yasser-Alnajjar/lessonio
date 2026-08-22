"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { DataTable } from "@/components/ui-system/data-table";
import type { DataTableRowAction } from "@/components/ui-system/data-table-core";
import { Link, useRouter } from "@/i18n/navigation";
import type { AssignmentForStudent } from "@/lib/types/assignment";
import type { SubmissionQueueEntry } from "@/lib/types/submission";
import { GradeSubmissionDialog } from "../../components/GradeSubmissionDialog";
import { useGradingColumns } from "./columns";

interface TeachingGradingViewProps {
  assignment: AssignmentForStudent | null;
  queue: SubmissionQueueEntry[];
}

export const TeachingGradingView = ({
  assignment,
  queue,
}: TeachingGradingViewProps) => {
  const t = useTranslations("teaching.grading");
  const router = useRouter();
  const columns = useGradingColumns();
  const [gradeTarget, setGradeTarget] = useState<SubmissionQueueEntry | null>(
    null,
  );

  if (!assignment) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <p className="text-sm text-muted-foreground">{t("notFound")}</p>
        <Link
          href="/teaching/assignments"
          className="text-sm font-medium text-primary hover:underline"
        >
          {t("backToAssignments")}
        </Link>
      </div>
    );
  }

  const rowActions: DataTableRowAction<SubmissionQueueEntry>[] = [
    {
      label: t("table.grade"),
      onClick: (row) => setGradeTarget(row),
      isHidden: (row) => row.submission === null,
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-4">
      <div>
        <Link
          href="/teaching/assignments"
          className="text-xs font-medium text-muted-foreground hover:underline"
        >
          {t("backToAssignments")}
        </Link>
        <h1 className="text-xl font-semibold text-foreground">
          {assignment.title}
        </h1>
        <p className="text-sm text-muted-foreground">{assignment.className}</p>
      </div>

      <DataTable
        columns={columns}
        data={queue}
        getRowId={(row) => row.studentId}
        rowActions={rowActions}
        emptyState={{
          variant: "no-data",
          title: t("emptyTitle"),
          description: t("emptyDescription"),
        }}
      />

      <GradeSubmissionDialog
        open={Boolean(gradeTarget)}
        onOpenChange={(open) => {
          if (!open) setGradeTarget(null);
        }}
        entry={gradeTarget}
        totalPoints={assignment.totalPoints}
        onGraded={() => {
          setGradeTarget(null);
          router.refresh();
        }}
      />
    </div>
  );
};
