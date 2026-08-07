import { format, parseISO } from "date-fns";
import { CalendarDays, Clock, MapPin, User } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui-system/status-badge";
import type { Lesson, LessonWithRelations } from "@/lib/types/lesson";

export interface LessonCardProps extends React.ComponentProps<"div"> {
  lesson: Lesson | LessonWithRelations;
  href?: string;
}

function hasRelations(
  lesson: Lesson | LessonWithRelations,
): lesson is LessonWithRelations {
  return "subjectName" in lesson;
}

export function LessonCard({ lesson, href, className, ...props }: LessonCardProps) {
  const relations = hasRelations(lesson) ? lesson : null;

  const content = (
    <Card
      data-slot="lesson-card"
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
            {lesson.title}
          </h3>
        </div>
        <StatusBadge kind="study" status={lesson.studyStatus} className="shrink-0" />
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="size-3.5" />
            {format(parseISO(lesson.date), "MMM d, yyyy")}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" />
            {lesson.time}
          </span>
          {lesson.teacher && (
            <span className="inline-flex items-center gap-1">
              <User className="size-3.5" />
              {lesson.teacher}
            </span>
          )}
          {lesson.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" />
              {lesson.location}
            </span>
          )}
        </div>
        {(lesson.homeworkStatus !== "none" || lesson.examStatus !== "none") && (
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {lesson.homeworkStatus !== "none" && (
              <StatusBadge kind="homework" status={lesson.homeworkStatus} />
            )}
            {lesson.examStatus !== "none" && (
              <StatusBadge kind="exam" status={lesson.examStatus} />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full">
        {content}
      </Link>
    );
  }

  return content;
}

export function LessonCardSkeleton({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <Card data-slot="lesson-card-skeleton" className={cn("h-full gap-3", className)} {...props}>
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
