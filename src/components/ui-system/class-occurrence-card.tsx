"use client";

import { format, parse, parseISO } from "date-fns";
import { Clock, MapPin, User } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui-system/status-badge";
import { WEEKDAY_LABEL_KEYS } from "@/lib/constants/classes";
import type { Weekday } from "@/lib/types/class";
import type { ClassOccurrenceWithRelations } from "@/lib/types/class-occurrence";

export interface ClassOccurrenceCardProps
  extends Omit<React.ComponentProps<"div">, "children"> {
  occurrence: ClassOccurrenceWithRelations;
  href?: string;
  actions?: React.ReactNode;
  /**
   * Rendered below the details — where today's card puts its Attendance and
   * Exam selects. Omitted on upcoming cards, which show read-only badges.
   */
  footer?: React.ReactNode;
}

/**
 * One dated instance of a recurring class: the subject, when it meets on this
 * particular date, and the attendance/exam state recorded against *this* date
 * only. Next week's occurrence of the same class is a separate card with its
 * own state.
 */
export function ClassOccurrenceCard({
  occurrence,
  href,
  actions,
  footer,
  className,
  ...props
}: ClassOccurrenceCardProps) {
  const tDays = useTranslations("classes.days");

  const weekday = parseISO(occurrence.date).getDay() as Weekday;
  const timeLabel = format(
    parse(occurrence.startTime.slice(0, 5), "HH:mm", new Date()),
    "h:mm a",
  );

  const content = (
    <Card
      data-slot="class-occurrence-card"
      className={cn(
        "h-full gap-3 transition-shadow flex flex-col p-4 relative",
        href && "cursor-pointer hover:shadow-md",
        className,
      )}
      {...props}
    >
      <div className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="min-w-0 flex-1">
          <span
            className="mb-1 inline-flex items-center gap-1.5 text-xs font-medium"
            style={{ color: occurrence.subjectColor }}
          >
            <span
              className="size-1.5 rounded-full"
              style={{ backgroundColor: occurrence.subjectColor }}
            />
            {occurrence.subjectName}
          </span>
          <h3 className="truncate text-sm font-medium text-foreground">
            {tDays(WEEKDAY_LABEL_KEYS[weekday])} · {timeLabel}
          </h3>
          <p className="text-xs text-muted-foreground">
            {format(parseISO(occurrence.date), "MMM d, yyyy")}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StatusBadge kind="attendance" status={occurrence.attendanceStatus} />
          {actions && <div className="w-8 shrink-0" aria-hidden />}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 text-xs text-muted-foreground relative">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" />
            {occurrence.startTime.slice(0, 5)} · {occurrence.durationMinutes}m
          </span>
          {occurrence.teacher && (
            <span className="inline-flex items-center gap-1">
              <User className="size-3.5" />
              {occurrence.teacher}
            </span>
          )}
          {occurrence.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" />
              {occurrence.location}
            </span>
          )}
        </div>
        {occurrence.examStatus !== "none" && (
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <StatusBadge kind="exam" status={occurrence.examStatus} />
          </div>
        )}
        {footer && <div className="mt-auto">{footer}</div>}
      </div>
    </Card>
  );

  // A card with interactive controls in its footer can't be wrapped in a
  // link — the selects would swallow their own clicks inside a navigation.
  const linked =
    href && !footer ? (
      <Link href={href} className="block h-full">
        {content}
      </Link>
    ) : (
      content
    );

  if (!actions) {
    return linked;
  }

  return (
    <div className="relative h-full">
      {linked}
      <div className="absolute inset-e-4 top-4">{actions}</div>
    </div>
  );
}

export function ClassOccurrenceCardSkeleton({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <Card
      data-slot="class-occurrence-card-skeleton"
      className={cn("h-full gap-3", className)}
      {...props}
    >
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Skeleton className="h-3 w-1/4" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-3 w-2/3" />
      </CardContent>
    </Card>
  );
}
