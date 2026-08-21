"use client";

import { CalendarClock } from "lucide-react";
import { format, isBefore, parseISO, startOfDay } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { AssignmentForStudent } from "@/lib/types/assignment";

interface AssignedWorkCardProps {
  title: string;
  overdueLabel: string;
  assignments: AssignmentForStudent[];
}

/**
 * Only rendered by `DashboardOverviewView` when `assignments.length > 0` —
 * an independent student never sees this card, so it's never a placeholder
 * for "no teacher yet".
 */
export function AssignedWorkCard({
  title,
  overdueLabel,
  assignments,
}: AssignedWorkCardProps) {
  return (
    <Card data-slot="assigned-work-card" className="gap-4">
      <CardHeader>
        <CardTitle className="text-base font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          {assignments.map((assignment) => {
            const isOverdue = isBefore(
              parseISO(assignment.dueAt),
              startOfDay(new Date()),
            );

            return (
              <Link
                key={assignment.id}
                href={`/classroom/assignment/${assignment.id}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3 text-sm hover:bg-accent"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">
                    {assignment.title}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {assignment.className}
                  </p>
                </div>
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground",
                    isOverdue && "font-medium text-destructive",
                  )}
                >
                  <CalendarClock className="size-3.5" />
                  {format(parseISO(assignment.dueAt), "MMM d")}
                  {isOverdue && ` · ${overdueLabel}`}
                </span>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
