import { format, parseISO } from "date-fns";
import { Clock, MapPin, User } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui-system/status-badge";
import type { Class, ClassWithRelations } from "@/lib/types/class";

export interface ClassCardProps extends React.ComponentProps<"div"> {
  klass: Class | ClassWithRelations;
  href?: string;
  actions?: React.ReactNode;
}

function hasRelations(
  klass: Class | ClassWithRelations,
): klass is ClassWithRelations {
  return "subjectName" in klass;
}

export function ClassCard({
  klass,
  href,
  actions,
  className,
  ...props
}: ClassCardProps) {
  const relations = hasRelations(klass) ? klass : null;

  const content = (
    <Card
      data-slot="class-card"
      className={cn(
        "h-full gap-3 transition-shadow",
        href && "cursor-pointer hover:shadow-md",
        className,
      )}
      {...props}
    >
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div className="min-w-0 flex-1">
          {relations && (
            <span
              className="mb-1 inline-flex items-center gap-1.5 text-xs font-medium"
              style={{ color: relations.subjectColor }}
            >
              <span
                className="size-1.5 rounded-full"
                style={{ backgroundColor: relations.subjectColor }}
              />
              {relations.subjectName}
            </span>
          )}
          <h3 className="truncate text-sm font-medium text-foreground">
            {format(parseISO(klass.date), "MMM d, yyyy")}
          </h3>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StatusBadge kind="attendance" status={klass.attendanceStatus} />
          {actions && <div className="w-8 shrink-0" aria-hidden />}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" />
            {klass.startTime.slice(0, 5)} · {klass.durationMinutes}m
          </span>
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
        {klass.examStatus !== "none" && (
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <StatusBadge kind="exam" status={klass.examStatus} />
          </div>
        )}
      </CardContent>
    </Card>
  );

  const linked = href ? (
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

export function ClassCardSkeleton({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <Card
      data-slot="class-card-skeleton"
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

