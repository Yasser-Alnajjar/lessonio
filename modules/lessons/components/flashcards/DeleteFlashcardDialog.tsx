"use client";

import { useTranslations } from "next-intl";

import { deleteFlashcard } from "@/actions/flashcards.mutations";
import { ConfirmDialog } from "@/components/ui-system/confirm-dialog";
import type { FlashcardWithRelations } from "@/lib/types/flashcard";

export interface DeleteFlashcardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flashcard: FlashcardWithRelations | null;
  onDeleted?: () => void;
}

export function DeleteFlashcardDialog({
  open,
  onOpenChange,
  flashcard,
  onDeleted,
}: DeleteFlashcardDialogProps) {
  const t = useTranslations("flashcards.delete");

  if (!flashcard) return null;

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("title")}
      description={t("description")}
      confirmLabel={t("confirm")}
      cancelLabel={t("cancel")}
      variant="destructive"
      onConfirm={async () => {
        const result = await deleteFlashcard(flashcard.id);
        if (!result.success) {
          throw new Error(result.error || t("genericError"));
        }
        onDeleted?.();
      }}
    />
  );
}
