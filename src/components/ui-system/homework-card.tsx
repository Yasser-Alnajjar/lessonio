"use client";

import { useTransition } from "react";
import { format, isBefore, parseISO, startOfDay } from "date-fns";
import { CalendarClock, BookOpen } from "lucide-react";

import { toggleHomeworkCompleted } from "@/actions/homework.mutations";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { HomeworkWithRelations } from "@/lib/types/homework";

export interface HomeworkCardProps extends React.ComponentProps<"div"> {
  homework: HomeworkWithRelations;
  overdueLabel: string;
  actions?: React.ReactNode;
  onToggled?: () => void;
}

export function HomeworkCard({
  homework,
  overdueLabel,
  actions,
  onToggled,
  className,
  ...props
}: HomeworkCardProps) {
  const [isPending, startTransition] = useTransition();

  const isOverdue =
    !homework.completed &&
    isBefore(parseISO(homework.deadline), startOfDay(new Date()));

  const handleToggle = (checked: boolean) => {
    startTransition(async () => {
      await toggleHomeworkCompleted(homework.id, checked);
      onToggled?.();
    });
  };

  return (
    <Card
      data-slot="homework-card"
      className={cn(
        "h-full gap-3 transition-shadow",
        homework.completed && "opacity-60",
        className,
      )}
      {...props}
    >
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <Checkbox
            checked={homework.completed}
            disabled={isPending}
            onCheckedChange={(checked) => handleToggle(checked === true)}
            className="mt-0.5"
          />
          <div className="min-w-0 flex-1">
            <span
              className="mb-1 inline-flex items-center gap-1.5 text-xs font-medium"
              style={{ color: homework.subjectColor }}
            >
              <span
                className="size-1.5 rounded-full"
                style={{ backgroundColor: homework.subjectColor }}
              />
              {homework.subjectName}
            </span>
            <h3
              className={cn(
                "truncate text-sm font-medium text-foreground",
                homework.completed && "line-through",
              )}
            >
              {homework.title}
            </h3>
          </div>
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
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
            {format(parseISO(homework.deadline), "MMM d, yyyy")}
            {isOverdue && ` · ${overdueLabel}`}
          </span>
          <span className="inline-flex items-center gap-1">
            <BookOpen className="size-3.5" />
            {homework.lessonTitle}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export function HomeworkCardSkeleton({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <Card
      data-slot="homework-card-skeleton"
      className={cn("h-full gap-3", className)}
      {...props}
    >
      <CardHeader className="flex-row items-start gap-3 space-y-0">
        <Skeleton className="mt-0.5 size-4 shrink-0 rounded-[4px]" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Skeleton className="h-3 w-1/4" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-3 w-2/3" />
      </CardContent>
    </Card>
  );
}
