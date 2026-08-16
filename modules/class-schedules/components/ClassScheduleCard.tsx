"use client";

import { format, parse } from "date-fns";
import { MapPin, User } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { WEEKDAY_LABEL_KEYS } from "@/lib/constants/class-schedules";
import { SUBJECT_ICON_COMPONENTS } from "@/lib/constants/subjects";
import { cn } from "@/lib/utils";
import type { ClassScheduleWithSubject } from "@/lib/types/class-schedule";

export interface ClassScheduleCardProps extends React.ComponentProps<"div"> {
  classSchedule: ClassScheduleWithSubject;
  actions?: React.ReactNode;
}

function formatDuration(minutes: number, hLabel: string, mLabel: string): string {
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (hours === 0) return `${remaining}${mLabel}`;
  if (remaining === 0) return `${hours}${hLabel}`;
  return `${hours}${hLabel} ${remaining}${mLabel}`;
}

export function ClassScheduleCard({
  classSchedule,
  actions,
  className,
  ...props
}: ClassScheduleCardProps) {
  const t = useTranslations("classSchedules.card");
  const tDays = useTranslations("classSchedules.days");

  const Icon = SUBJECT_ICON_COMPONENTS[classSchedule.subjectIcon];
  const sortedSchedules = [...classSchedule.schedules].sort(
    (a, b) => a.dayOfWeek - b.dayOfWeek,
  );

  return (
    <div className="relative h-full">
      <Card
        data-slot="class-schedule-card"
        className={cn(
          "h-full gap-3 transition-shadow",
          !classSchedule.isActive && "opacity-60",
          className,
        )}
        {...props}
      >
        <CardHeader className="flex-row items-start gap-3 space-y-0">
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-xl"
            style={{
              backgroundColor: `color-mix(in oklch, ${classSchedule.subjectColor} 16%, transparent)`,
              color: classSchedule.subjectColor,
            }}
          >
            <Icon className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-medium text-foreground">
                {classSchedule.subjectName}
              </h3>
              <Badge
                variant={classSchedule.isActive ? "default" : "secondary"}
                className="shrink-0 text-[10px]"
              >
                {classSchedule.isActive ? t("active") : t("inactive")}
              </Badge>
            </div>
          </div>
          {actions && <div className="w-8 shrink-0" aria-hidden />}
        </CardHeader>
        <CardContent className="flex flex-col gap-1.5 text-xs text-muted-foreground">
          {sortedSchedules.map((entry, index) => {
            const timeLabel = format(
              parse(entry.startTime, "HH:mm", new Date()),
              "h:mm a",
            );
            const durationLabel = formatDuration(
              entry.durationMinutes,
              t("hoursSuffix"),
              t("minutesSuffix"),
            );
            return (
              <span key={`${entry.dayOfWeek}-${index}`} className="inline-flex items-center gap-1">
                <span className="font-medium text-foreground">
                  {tDays(WEEKDAY_LABEL_KEYS[entry.dayOfWeek])}
                </span>
                · {timeLabel} · {durationLabel}
              </span>
            );
          })}
          {(classSchedule.teacher || classSchedule.location) && (
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              {classSchedule.teacher && (
                <span className="inline-flex items-center gap-1">
                  <User className="size-3.5" />
                  {classSchedule.teacher}
                </span>
              )}
              {classSchedule.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5" />
                  {classSchedule.location}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      {actions && <div className="absolute end-4 top-4">{actions}</div>}
    </div>
  );
}

export function ClassScheduleCardSkeleton({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <Card
      data-slot="class-schedule-card-skeleton"
      className={cn("h-full gap-3", className)}
      {...props}
    >
      <CardHeader className="flex-row items-start gap-3 space-y-0">
        <Skeleton className="size-10 shrink-0 rounded-xl" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-3 w-2/3" />
      </CardContent>
    </Card>
  );
}
