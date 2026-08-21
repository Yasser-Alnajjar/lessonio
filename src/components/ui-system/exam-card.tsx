"use client";

import { useState, useTransition } from "react";
import { format, parseISO } from "date-fns";
import { CalendarDays, BookOpen } from "lucide-react";

import { updateExamScore } from "@/actions/exams.mutations";
import { LessonioSpinner } from "@/components/shared/lessonio-mark";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Ring } from "@/components/ui-system/ring";
import { cn } from "@/lib/utils";
import type { ExamWithRelations } from "@/lib/types/exam";

export interface ExamCardProps extends React.ComponentProps<"div"> {
  exam: ExamWithRelations;
  notGradedLabel: string;
  scorePlaceholder: string;
  recordScoreLabel: string;
  outOfLabel: string;
  actions?: React.ReactNode;
  onScored?: () => void;
}

export function ExamCard({
  exam,
  notGradedLabel,
  scorePlaceholder,
  recordScoreLabel,
  outOfLabel,
  actions,
  onScored,
  className,
  ...props
}: ExamCardProps) {
  const [scoreInput, setScoreInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleRecordScore = () => {
    const value = Number(scoreInput);
    if (
      !scoreInput ||
      Number.isNaN(value) ||
      value < 0 ||
      value > exam.totalScore
    )
      return;

    setError(null);
    startTransition(async () => {
      const result = await updateExamScore(exam.id, value);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setScoreInput("");
      onScored?.();
    });
  };

  return (
    <Card
      data-slot="exam-card"
      className={cn("h-full gap-3 transition-shadow", className)}
      {...props}
    >
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div className="min-w-0 flex-1">
          <span
            className="mb-1 inline-flex items-center gap-1.5 text-xs font-medium"
            style={{ color: exam.subjectColor }}
          >
            <span
              className="size-1.5 rounded-full"
              style={{ backgroundColor: exam.subjectColor }}
            />
            {exam.subjectName}
          </span>
          <h3 className="truncate text-sm font-medium text-foreground">
            {exam.title}
          </h3>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {exam.percentage !== null && (
            <Ring value={exam.percentage} size="sm" />
          )}
          {actions}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="size-3.5" />
            {format(parseISO(exam.date), "MMM d, yyyy")}
          </span>
          <span className="inline-flex items-center gap-1">
            <BookOpen className="size-3.5" />
            {exam.lessonTitle}
          </span>
        </div>

        {exam.score !== null ? (
          <span className="text-sm font-medium text-foreground">
            {exam.score} / {exam.totalScore} {outOfLabel}
          </span>
        ) : (
          <div className="flex items-center gap-2 pt-1">
            <span className="text-muted-foreground">{notGradedLabel}</span>
            <Input
              type="number"
              min={0}
              max={exam.totalScore}
              placeholder={scorePlaceholder}
              value={scoreInput}
              onChange={(event) => setScoreInput(event.target.value)}
              className="h-7 w-20"
              disabled={isPending}
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-7"
              disabled={isPending || !scoreInput}
              onClick={handleRecordScore}
            >
              {isPending && <LessonioSpinner className="size-8" />}
              {recordScoreLabel}
            </Button>
          </div>
        )}
        {error && <p className="text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}

export function ExamCardSkeleton({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <Card
      data-slot="exam-card-skeleton"
      className={cn("h-full gap-3", className)}
      {...props}
    >
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Skeleton className="h-3 w-1/4" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <Skeleton className="size-10 shrink-0 rounded-full" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-3 w-2/3" />
      </CardContent>
    </Card>
  );
}
