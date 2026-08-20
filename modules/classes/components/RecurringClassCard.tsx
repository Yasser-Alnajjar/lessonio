"use client";

import { format, parse } from "date-fns";
import { MapPin, User } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { WEEKDAY_LABEL_KEYS } from "@/lib/constants/classes";
import { SUBJECT_ICON_COMPONENTS } from "@/lib/constants/subjects";
import { cn } from "@/lib/utils";
import type { ClassWithSubject } from "@/lib/types/class";

export interface RecurringClassCardProps extends React.ComponentProps<"div"> {
  klass: ClassWithSubject;
  actions?: React.ReactNode;
}

function formatDuration(minutes: number, hLabel: string, mLabel: string): string {
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (hours === 0) return `${remaining}${mLabel}`;
  if (remaining === 0) return `${hours}${hLabel}`;
  return `${hours}${hLabel} ${remaining}${mLabel}`;
}

/**
 * The recurring class itself — its weekly meetings, teacher and location.
 * The dated instances that carry attendance/exam state render as
 * `ClassOccurrenceCard`.
 */
export function RecurringClassCard({
  klass,
  actions,
  className,
  ...props
}: RecurringClassCardProps) {
  const t = useTranslations("classes.card");
  const tDays = useTranslations("classes.days");

  const Icon = SUBJECT_ICON_COMPONENTS[klass.subjectIcon];
  const sortedMeetings = [...klass.meetings].sort(
    (a, b) => a.dayOfWeek - b.dayOfWeek,
  );

  return (
    <div className="relative h-full">
      <Card
        data-slot="recurring-class-card"
        className={cn(
          "h-full gap-3 transition-shadow",
          !klass.isActive && "opacity-60",
          className,
        )}
        {...props}
      >
        <CardHeader className="flex-row items-start gap-3 space-y-0">
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-xl"
            style={{
              backgroundColor: `color-mix(in oklch, ${klass.subjectColor} 16%, transparent)`,
              color: klass.subjectColor,
            }}
          >
            <Icon className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-medium text-foreground">
                {klass.subjectName}
              </h3>
              <Badge
                variant={klass.isActive ? "default" : "secondary"}
                className="shrink-0 text-[10px]"
              >
                {klass.isActive ? t("active") : t("inactive")}
              </Badge>
            </div>
          </div>
          {actions && <div className="w-8 shrink-0" aria-hidden />}
        </CardHeader>
        <CardContent className="flex flex-col gap-1.5 text-xs text-muted-foreground">
          {sortedMeetings.map((entry, index) => {
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
          {(klass.teacher || klass.location) && (
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              {klass.teacher && (
                <span className="inline-flex items-center gap-1">
                  <User className="size-3.5" />
                  {klass.teacher}
                </span>
              )}
              {klass.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5" />
                  {klass.location}
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

export function RecurringClassCardSkeleton({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <Card
      data-slot="recurring-class-card-skeleton"
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
