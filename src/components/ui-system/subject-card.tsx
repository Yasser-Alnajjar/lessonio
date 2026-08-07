import {
  BookOpen,
  Calculator,
  Code,
  Dumbbell,
  FlaskConical,
  Globe,
  Landmark,
  Languages,
  Music,
  Palette,
} from "lucide-react";

import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Subject, SubjectIcon, SubjectWithStats } from "@/lib/types/subject";

const SUBJECT_ICONS: Record<SubjectIcon, React.ComponentType<{ className?: string }>> = {
  "book-open": BookOpen,
  calculator: Calculator,
  "flask-conical": FlaskConical,
  globe: Globe,
  landmark: Landmark,
  palette: Palette,
  code: Code,
  music: Music,
  dumbbell: Dumbbell,
  languages: Languages,
};

export interface SubjectCardProps extends React.ComponentProps<"div"> {
  subject: Subject | SubjectWithStats;
  href?: string;
  progressLabel?: string;
}

function hasStats(
  subject: Subject | SubjectWithStats,
): subject is SubjectWithStats {
  return "stats" in subject;
}

export function SubjectCard({
  subject,
  href,
  progressLabel = "Progress",
  className,
  ...props
}: SubjectCardProps) {
  const Icon = SUBJECT_ICONS[subject.icon];
  const progress = hasStats(subject)
    ? Math.min(100, Math.max(0, subject.stats.studyRate))
    : null;

  const content = (
    <Card
      data-slot="subject-card"
      className={cn(
        "h-full gap-4 transition-shadow",
        href && "cursor-pointer hover:shadow-md",
        className,
      )}
      {...props}
    >
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-xl"
          style={{
            backgroundColor: `color-mix(in oklch, ${subject.color} 16%, transparent)`,
            color: subject.color,
          }}
        >
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-medium text-foreground">
            {subject.name}
          </h3>
          {hasStats(subject) && (
            <p className="truncate text-xs text-muted-foreground">
              {subject.stats.totalLessons} lesson
              {subject.stats.totalLessons === 1 ? "" : "s"}
            </p>
          )}
        </div>
      </CardHeader>
      {progress !== null && (
        <CardContent className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{progressLabel}</span>
            <span className="font-medium text-foreground">{progress}%</span>
          </div>
          <Progress value={progress} />
        </CardContent>
      )}
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

export function SubjectCardSkeleton({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <Card
      data-slot="subject-card-skeleton"
      className={cn("h-full gap-4", className)}
      {...props}
    >
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <Skeleton className="size-10 shrink-0 rounded-xl" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-2 w-full" />
      </CardContent>
    </Card>
  );
}
