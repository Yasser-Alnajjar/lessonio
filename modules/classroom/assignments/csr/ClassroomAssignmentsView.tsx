"use client";

import { useTranslations } from "next-intl";

import { AssignmentCard } from "@/components/ui-system/assignment-card";
import { EmptyState } from "@/components/ui-system/empty-state";
import type { AssignmentForStudent } from "@/lib/types/assignment";

interface ClassroomAssignmentsViewProps {
  assignments: AssignmentForStudent[];
}

export const ClassroomAssignmentsView = ({
  assignments,
}: ClassroomAssignmentsViewProps) => {
  const t = useTranslations("classroom.assignments");

  return (
    <div className="flex flex-col gap-6 p-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {assignments.length === 0 ? (
        <EmptyState
          variant="no-data"
          title={t("empty.title")}
          description={t("empty.description")}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {assignments.map((item) => (
            <AssignmentCard
              key={item.id}
              assignment={item}
              overdueLabel={t("card.overdue")}
              pointsLabel={t("card.points", { points: item.totalPoints })}
            />
          ))}
        </div>
      )}
    </div>
  );
};
