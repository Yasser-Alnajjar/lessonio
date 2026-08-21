"use client";

import { CalendarClock, GraduationCap, Presentation } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useTranslations } from "next-intl";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import type { AssignmentForStudent } from "@/lib/types/assignment";

interface ClassroomAssignmentDetailViewProps {
  assignment: AssignmentForStudent | null;
}

export const ClassroomAssignmentDetailView = ({
  assignment,
}: ClassroomAssignmentDetailViewProps) => {
  const t = useTranslations("classroom.assignment");

  if (!assignment) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <p className="text-sm text-muted-foreground">{t("notFound")}</p>
        <Link
          href="/classroom/assignments"
          className="text-sm font-medium text-primary hover:underline"
        >
          {t("backToAssignments")}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      <div>
        <Link
          href="/classroom/assignments"
          className="text-xs font-medium text-muted-foreground hover:underline"
        >
          {t("backToAssignments")}
        </Link>
        <h1 className="text-xl font-semibold text-foreground">
          {assignment.title}
        </h1>
        <p className="text-sm text-muted-foreground">{assignment.className}</p>
      </div>

      <Card className="gap-4">
        <CardHeader className="flex flex-row flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <CalendarClock className="size-4" />
            {t("due", {
              date: format(parseISO(assignment.dueAt), "MMM d, yyyy · h:mm a"),
            })}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <GraduationCap className="size-4" />
            {t("points", { points: assignment.totalPoints })}
          </span>
          {assignment.teacherName && (
            <span className="inline-flex items-center gap-1.5">
              <Presentation className="size-4" />
              {assignment.teacherName}
            </span>
          )}
        </CardHeader>
        {assignment.instructions && (
          <CardContent>
            <p className="text-sm whitespace-pre-wrap text-foreground/90">
              {assignment.instructions}
            </p>
          </CardContent>
        )}
      </Card>
    </div>
  );
};
