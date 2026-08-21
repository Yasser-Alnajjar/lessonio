"use client";

import { CalendarClock, GraduationCap } from "lucide-react";
import { format, isBefore, parseISO, startOfDay } from "date-fns";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AssignmentWithStats } from "@/lib/types/assignment";

export interface TeacherAssignmentCardProps
  extends React.ComponentProps<"div"> {
  item: AssignmentWithStats;
  actions?: React.ReactNode;
}

export function TeacherAssignmentCard({
  item,
  actions,
  className,
  ...props
}: TeacherAssignmentCardProps) {
  const t = useTranslations("teaching.assignments.card");
  const isOverdue =
    item.status === "published" &&
    isBefore(parseISO(item.dueAt), startOfDay(new Date()));

  return (
    <div className="relative h-full">
      <Card
        data-slot="teacher-assignment-card"
        className={cn(
          "h-full gap-3 transition-shadow",
          item.status === "draft" && "opacity-80",
          className,
        )}
        {...props}
      >
        <CardHeader className="flex-row items-start gap-3 space-y-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-medium text-foreground">
                {item.title}
              </h3>
              <Badge
                variant={item.status === "published" ? "default" : "secondary"}
                className="shrink-0 text-[10px]"
              >
                {t(item.status)}
              </Badge>
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {item.className}
            </p>
          </div>
          {actions && <div className="w-8 shrink-0" aria-hidden />}
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span
              className={cn(
                "inline-flex items-center gap-1",
                isOverdue && "font-medium text-destructive",
              )}
            >
              <CalendarClock className="size-3.5" />
              {format(parseISO(item.dueAt), "MMM d, yyyy")}
            </span>
            <span className="inline-flex items-center gap-1">
              <GraduationCap className="size-3.5" />
              {t("points", { points: item.totalPoints })}
            </span>
          </div>
        </CardContent>
      </Card>
      {actions && <div className="absolute end-4 top-4">{actions}</div>}
    </div>
  );
}
