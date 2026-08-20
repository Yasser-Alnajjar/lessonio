"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { Layers, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui-system/empty-state";
import { Link, useRouter } from "@/i18n/navigation";
import type { FlashcardWithRelations } from "@/lib/types/flashcard";
import { DeleteFlashcardDialog } from "./DeleteFlashcardDialog";
import { FlashcardActionsMenu } from "./FlashcardActionsMenu";
import { FlashcardFormDialog } from "./FlashcardFormDialog";

export interface FlashcardsPanelProps {
  lessonId: string;
  flashcards: FlashcardWithRelations[];
}

interface FormState {
  open: boolean;
  flashcard: FlashcardWithRelations | null;
}

function isDueToday(dueDate: string): boolean {
  return dueDate <= format(new Date(), "yyyy-MM-dd");
}

export function FlashcardsPanel({
  lessonId,
  flashcards,
}: FlashcardsPanelProps) {
  const t = useTranslations("flashcards.panel");
  const router = useRouter();
  const [formState, setFormState] = useState<FormState>({
    open: false,
    flashcard: null,
  });
  const [deleteTarget, setDeleteTarget] =
    useState<FlashcardWithRelations | null>(null);

  const dueCount = useMemo(
    () => flashcards.filter((card) => isDueToday(card.dueDate)).length,
    [flashcards],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {t("count", { count: flashcards.length })}
        </p>
        <div className="flex items-center gap-2">
          {dueCount > 0 && (
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link
                href={{ pathname: "/flashcards/review", query: { lessonId } }}
              >
                <Layers className="size-4" />
                {t("reviewDue", { count: dueCount })}
              </Link>
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => setFormState({ open: true, flashcard: null })}
          >
            <Plus />
            {t("addCard")}
          </Button>
        </div>
      </div>

      {flashcards.length === 0 ? (
        <EmptyState
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          action={{
            label: t("addCard"),
            onClick: () => setFormState({ open: true, flashcard: null }),
          }}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {flashcards.map((card) => (
            <Card key={card.id} className="gap-2">
              <CardContent className="flex items-start justify-between gap-3 pt-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {card.front}
                  </p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {card.back}
                  </p>
                  <Badge
                    variant={isDueToday(card.dueDate) ? "secondary" : "outline"}
                    className="mt-2"
                  >
                    {isDueToday(card.dueDate)
                      ? t("dueNow")
                      : t("dueOn", { date: card.dueDate })}
                  </Badge>
                </div>
                <FlashcardActionsMenu
                  onEdit={() => setFormState({ open: true, flashcard: card })}
                  onDelete={() => setDeleteTarget(card)}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <FlashcardFormDialog
        open={formState.open}
        onOpenChange={(open) => setFormState((prev) => ({ ...prev, open }))}
        lessonId={lessonId}
        flashcard={formState.flashcard}
        onSaved={() => router.refresh()}
      />

      <DeleteFlashcardDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        flashcard={deleteTarget}
        onDeleted={() => {
          setDeleteTarget(null);
          router.refresh();
        }}
      />
    </div>
  );
}
