"use client";

import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { FlashcardWithRelations } from "@/lib/types/flashcard";
import { ReviewRunner } from "../../components/ReviewRunner";

interface FlashcardsReviewViewProps {
  cards: FlashcardWithRelations[];
  backHref: string;
}

export const FlashcardsReviewView = ({
  cards,
  backHref,
}: FlashcardsReviewViewProps) => {
  const t = useTranslations("flashcards.review");

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon-sm">
          <Link href={backHref} aria-label={t("back")}>
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <h1 className="text-xl font-semibold text-foreground">{t("title")}</h1>
      </div>

      <ReviewRunner cards={cards} backHref={backHref} />
    </div>
  );
};
