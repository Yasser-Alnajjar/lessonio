"use client";

import { useTranslations } from "next-intl";
import { Layers } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui-system/empty-state";
import { Link } from "@/i18n/navigation";
import type { FlashcardDeckSummary } from "@/lib/types/flashcard";

interface FlashcardsDeckViewProps {
  decks: FlashcardDeckSummary[];
}

export const FlashcardsDeckView = ({ decks }: FlashcardsDeckViewProps) => {
  const t = useTranslations("flashcards.deck");

  const totalDue = decks.reduce((sum, deck) => sum + deck.dueCount, 0);
  const totalCards = decks.reduce((sum, deck) => sum + deck.totalCards, 0);

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("subtitle", { total: totalCards, due: totalDue })}
          </p>
        </div>
        {totalDue > 0 && (
          <Button asChild className="gap-2">
            <Link href="/flashcards/review">
              <Layers className="size-4" />
              {t("reviewAllDue", { count: totalDue })}
            </Link>
          </Button>
        )}
      </div>

      {decks.length === 0 ? (
        <EmptyState
          title={t("emptyTitle")}
          description={t("emptyDescription")}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {decks.map((deck) => (
            <Card key={deck.subjectId} className="gap-3">
              <CardContent className="flex flex-col gap-3 pt-6">
                <span
                  className="inline-flex items-center gap-1.5 text-sm font-medium"
                  style={{ color: deck.subjectColor }}
                >
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: deck.subjectColor }}
                  />
                  {deck.subjectName}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-semibold tabular-nums text-foreground">
                    {deck.totalCards}
                  </span>
                  <span className="text-xs text-muted-foreground">{t("cardsLabel")}</span>
                  {deck.dueCount > 0 && (
                    <Badge variant="secondary" className="ms-auto">
                      {t("dueCount", { count: deck.dueCount })}
                    </Badge>
                  )}
                </div>
                {deck.dueCount > 0 ? (
                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link href={{ pathname: "/flashcards/review", query: { subjectId: deck.subjectId } }}>
                      {t("review")}
                    </Link>
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" disabled className="w-full">
                    {t("review")}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
