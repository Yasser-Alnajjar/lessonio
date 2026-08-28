"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";

import { recordFlashcardReview } from "@/actions/flashcards.mutations";
import { LessonioSpinner } from "@/components/shared/lessonio-mark";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui-system/empty-state";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { FlashcardGrade } from "@/lib/flashcards/sm2";
import type { FlashcardWithRelations } from "@/lib/types/flashcard";

export interface ReviewRunnerProps {
  cards: FlashcardWithRelations[];
  backHref: string;
}

const GRADE_STYLES: Record<FlashcardGrade, string> = {
  again: "border-destructive/40 text-destructive hover:bg-destructive/10",
  hard: "border-highlighter/40 text-highlighter hover:bg-highlighter/10",
  good: "border-primary/40 text-primary hover:bg-primary/10",
  easy: "border-success/40 text-success hover:bg-success/10",
};

export function ReviewRunner({ cards, backHref }: ReviewRunnerProps) {
  const t = useTranslations("flashcards.review");
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [pendingGrade, setPendingGrade] = useState<FlashcardGrade | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

  if (cards.length === 0) {
    return (
      <EmptyState
        variant="no-data"
        title={t("emptyTitle")}
        description={t("emptyDescription")}
        action={{ label: t("backToDeck"), href: backHref }}
      />
    );
  }

  const current = cards[index];
  const isDone = index >= cards.length;

  if (isDone || !current) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <CheckCircle2 className="size-12 text-success" />
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {t("sessionCompleteTitle")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("sessionCompleteDescription", { count: reviewedCount })}
          </p>
        </div>
        <Button asChild>
          <Link href={backHref}>{t("backToDeck")}</Link>
        </Button>
      </div>
    );
  }

  const handleGrade = (grade: FlashcardGrade) => {
    setPendingGrade(grade);
    startTransition(async () => {
      await recordFlashcardReview(current.id, grade);
      setReviewedCount((prev) => prev + 1);
      setIndex((prev) => prev + 1);
      setFlipped(false);
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      <p className="text-center text-sm text-muted-foreground">
        {t("progress", { current: index + 1, total: cards.length })}
      </p>

      <Card
        role="button"
        tabIndex={0}
        onClick={() => setFlipped((prev) => !prev)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ")
            setFlipped((prev) => !prev);
        }}
        className="flex min-h-64 cursor-pointer items-center justify-center p-8 text-center transition-colors"
      >
        <CardContent className="flex flex-col items-center gap-3 p-0">
          <span
            className="inline-flex items-center gap-1.5 text-xs font-medium"
            style={{ color: current.subjectColor }}
          >
            <span
              className="size-1.5 rounded-full"
              style={{ backgroundColor: current.subjectColor }}
            />
            {current.subjectName}
          </span>
          <p className="text-lg font-medium text-foreground">
            {flipped ? current.back : current.front}
          </p>
          {!flipped && (
            <p className="mt-2 text-xs text-muted-foreground">
              {t("tapToFlip")}
            </p>
          )}
        </CardContent>
      </Card>

      {flipped ? (
        <div className="grid grid-cols-4 gap-2">
          {(["again", "hard", "good", "easy"] as const).map((grade) => (
            <Button
              key={grade}
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => handleGrade(grade)}
              className={cn("flex-col gap-1 py-3", GRADE_STYLES[grade])}
            >
              {isPending && pendingGrade === grade ? (
                <LessonioSpinner className="size-4" />
              ) : (
                t(`grades.${grade}`)
              )}
            </Button>
          ))}
        </div>
      ) : (
        <Button onClick={() => setFlipped(true)} className="w-full">
          {t("showAnswer")}
        </Button>
      )}
    </div>
  );
}
