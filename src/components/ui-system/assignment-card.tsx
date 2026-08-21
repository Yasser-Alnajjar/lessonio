"use client";

import { CalendarClock, GraduationCap } from "lucide-react";
import { format, isBefore, parseISO, startOfDay } from "date-fns";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { AssignmentForStudent } from "@/lib/types/assignment";

export interface AssignmentCardProps extends React.ComponentProps<"div"> {
  assignment: AssignmentForStudent;
  overdueLabel: string;
  pointsLabel: string;
}

/**
 * Read-only sibling of `homework-card.tsx` — teacher-assigned work isn't
 * student-editable, so there's no checkbox and no actions menu, unlike
 * `HomeworkCard`.
 */
export function AssignmentCard({
  assignment,
  overdueLabel,
  pointsLabel,
  className,
  ...props
}: AssignmentCardProps) {
  const isOverdue = isBefore(
    parseISO(assignment.dueAt),
    startOfDay(new Date()),
  );

  return (
    <Card
      data-slot="assignment-card"
      className={cn("h-full gap-3 transition-shadow", className)}
      {...props}
    >
      <CardHeader className="space-y-0">
        <span className="mb-1 inline-flex items-center gap-1.5 text-xs font-medium text-primary">
          {assignment.className}
        </span>
        <Link
          href={`/classroom/assignment/${assignment.id}`}
          className="truncate text-sm font-medium text-foreground hover:underline"
        >
          {assignment.title}
        </Link>
        {assignment.teacherName && (
          <p className="truncate text-xs text-muted-foreground">
            {assignment.teacherName}
          </p>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span
            className={cn(
              "inline-flex items-center gap-1",
              isOverdue && "font-medium text-destructive",
            )}
          >
            <CalendarClock className="size-3.5" />
            {format(parseISO(assignment.dueAt), "MMM d, yyyy")}
            {isOverdue && ` · ${overdueLabel}`}
          </span>
          <span className="inline-flex items-center gap-1">
            <GraduationCap className="size-3.5" />
            {pointsLabel}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export function AssignmentCardSkeleton({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <Card
      data-slot="assignment-card-skeleton"
      className={cn("h-full gap-3", className)}
      {...props}
    >
      <CardHeader className="flex flex-col gap-2 space-y-0">
        <Skeleton className="h-3 w-1/4" />
        <Skeleton className="h-4 w-3/4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-3 w-2/3" />
      </CardContent>
    </Card>
  );
}
